'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Loader2, ArrowLeft, Package, Search, ChevronDown, ImageIcon } from 'lucide-react';
import api from '@/lib/axios';
import { formatCurrency, getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';

// ── Simple Custom Product Selector with Images ──
function SimpleProductSelector({ products, value, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const selectedProduct = products.find(p => String(p.id) === String(value));
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div onClick={() => setIsOpen(!isOpen)} className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-[3px] text-[13px] flex items-center justify-between cursor-pointer focus:border-[#e77600] outline-none">
                <div className="flex items-center gap-2 overflow-hidden">
                    {selectedProduct ? (
                        <>
                            <div className="w-6 h-6 border rounded overflow-hidden flex-shrink-0">
                                {selectedProduct.image ? <img src={getImageUrl(selectedProduct.image)} className="w-full h-full object-cover" /> : <Package size={12} className="text-gray-400 mx-auto" />}
                            </div>
                            <span className="truncate font-medium">{selectedProduct.name}</span>
                        </>
                    ) : <span className="text-gray-400 italic">Select product...</span>}
                </div>
                <ChevronDown size={14} className="text-gray-400" />
            </div>
            {isOpen && (
                <div className="absolute z-[100] top-full left-0 w-full mt-1 bg-white border border-gray-300 rounded-sm shadow-xl overflow-hidden max-h-[300px] flex flex-col">
                    <div className="p-2 border-b bg-gray-50 flex items-center gap-2">
                        <Search size={14} className="text-gray-400" />
                        <input autoFocus className="bg-transparent border-none outline-none text-[12px] w-full" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} />
                    </div>
                    <div className="overflow-y-auto">
                        {filteredProducts.map(p => (
                            <div key={p.id} onClick={() => { onChange(p.id.toString()); setIsOpen(false); }} className="p-2 hover:bg-gray-100 border-b last:border-none border-gray-50 flex items-center gap-3 cursor-pointer">
                                <div className="w-8 h-8 border rounded overflow-hidden flex-shrink-0">
                                    {p.image ? <img src={getImageUrl(p.image)} className="w-full h-full object-cover" /> : <ImageIcon size={14} className="text-gray-300 mx-auto mt-2" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-bold text-gray-800 truncate">{p.name}</p>
                                    <p className="text-[10px] text-gray-400">Stock: {p.quantity || 0}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AddPurchasePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    
    const [form, setForm] = useState({
        supplier: '', reference_number: '', status: 'PENDING',
        payment_status: 'UNPAID', expected_delivery_date: '', shipping_cost: 0,
        tax_amount: 0, notes: '',
    });

    const [items, setItems] = useState<any[]>([{ 
        product: '', quantity: 1, price: 0, selling_price: 0,
        packaging_type: 'SINGLE', items_per_carton: 1
    }]);

    const loadMeta = useCallback(async () => {
        try {
            const [usersRes, prodsRes] = await Promise.all([
                api.get('/v1/users/?role_name=SUPPLIER'), 
                api.get('/v1/products/supplier-items/') // Staff/Admin sees all via get_queryset update
            ]);
            
            const users = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.results || [];
            const prodList = Array.isArray(prodsRes.data) ? prodsRes.data : prodsRes.data.results || [];
            
            setSuppliers(users);
            setProducts(prodList);
            console.log("Registry Synced:", { 
                suppliers: users.map(u => ({ id: u.id, name: u.username })), 
                products: prodList.map(p => ({ id: p.id, name: p.name, supplier: p.supplier })) 
            });
        } catch (err) {
            console.error(err);
            toast.error("Failed to load global supplier registry.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadMeta(); }, [loadMeta]);

    const addItem = () => setItems([...items, { product: '', quantity: 1, price: 0, selling_price: 0, packaging_type: 'SINGLE', items_per_carton: 1 }]);
    const removeItem = (i: number) => items.length > 1 && setItems(items.filter((_, idx) => idx !== i));
    
    const updateItem = (i: number, field: string, val: any) => {
        const newItems = [...items];
        newItems[i][field] = val;
        if (field === 'product') {
            const prod = products.find(p => String(p.id) === String(val));
            if (prod) {
                newItems[i].price = prod.cost_price || 0;
                newItems[i].selling_price = prod.retail_price || 0;
                newItems[i].items_per_carton = prod.items_per_carton || 1;
            }
        }
        setItems(newItems);
    };

    const itemsTotal = items.reduce((sum, it) => sum + (it.quantity * it.price), 0);
    const grandTotal = itemsTotal + Number(form.shipping_cost) + Number(form.tax_amount);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/v1/sales/purchases/', {
                ...form, total_amount: grandTotal,
                items: items.map(it => ({
                    product: parseInt(it.product), quantity: parseInt(it.quantity),
                    price: parseFloat(it.price), selling_price: parseFloat(it.selling_price),
                    packaging_type: it.packaging_type, items_per_carton: parseInt(it.items_per_carton)
                }))
            });
            toast.success("Order Saved");
            router.push('/admin/purchases');
        } catch (err) {
            toast.error("Error saving.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-bold text-gray-400 text-xs">Loading context...</div>;

    return (
        <div className="max-w-[1200px] mx-auto p-4 md:p-8 font-sans bg-white border border-gray-200 mt-6 min-h-screen mb-20 shadow-sm rounded-sm">
            <div className="flex items-center justify-between border-b border-gray-300 pb-4 mb-8">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    Purchase Order Registry <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">WH0-ALQ</span>
                </h1>
                <button onClick={() => router.back()} className="text-[12px] text-[#007185] hover:underline flex items-center gap-1 font-bold">
                    <ArrowLeft size={14} /> Back
                </button>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-4 gap-10 overflow-visible">
                <div className="lg:col-span-3 space-y-8">
                    {/* Identification */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-6 border rounded-sm">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600 uppercase">Select Supplier Partner *</label>
                            <select required value={form.supplier} onChange={(e) => { setForm({...form, supplier: e.target.value}); setItems([{ product: '', quantity: 1, price: 0, selling_price: 0, packaging_type: 'SINGLE', items_per_carton: 1 }]); }} className="w-full border border-gray-300 rounded-[2px] p-2 text-[13px] font-medium focus:border-[#e77600] outline-none">
                                <option value="">Choose Supplier...</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.business_name || s.username}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600 uppercase">Invoice Reference #</label>
                            <input type="text" value={form.reference_number} onChange={(e) => setForm({...form, reference_number: e.target.value})} className="w-full border border-gray-300 rounded-[2px] p-2 text-[13px] font-medium outline-none focus:border-[#e77600]" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600 uppercase">Expected Deployment</label>
                            <input type="date" value={form.expected_delivery_date} onChange={(e) => setForm({...form, expected_delivery_date: e.target.value})} className="w-full border border-gray-300 rounded-[2px] p-2 text-[13px] font-medium outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600 uppercase">Order Registry Status</label>
                            <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} className="w-full border border-gray-300 rounded-[2px] p-2 text-[13px] font-medium outline-none">
                                <option value="PENDING">Pending (Draft)</option>
                                <option value="RECEIVED">Received (Verified)</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    {/* Acquisition Ledger */}
                    <div className="border border-gray-300 rounded-sm overflow-visible">
                        <div className="bg-gray-100 p-2 text-[10px] font-black text-gray-500 uppercase grid grid-cols-12 gap-2 border-b">
                            <div className="col-span-4 pl-2">Asset Item (Image)</div>
                            <div className="col-span-2 text-center">Pack Info</div>
                            <div className="col-span-1 text-center">Qty</div>
                            <div className="col-span-2 text-right">Cost Price</div>
                            <div className="col-span-2 text-right">Sale Price</div>
                            <div className="col-span-1"></div>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {items.map((it, i) => (
                                <div key={i} className="p-4 grid grid-cols-12 gap-3 items-start bg-white hover:bg-[#fcfcfc] transition-colors relative">
                                    <div className="col-span-4">
                                        <SimpleProductSelector 
                                            products={products.filter(p => {
                                                // If supplier is selected, we filter. 
                                                // BUT: If the user expects to see all 3 products, they might have assigned them differently.
                                                // I will allow seeing ALL products if no specific supplier filter is intended, 
                                                // or strictly follow the selected supplier but help the user see what's happening.
                                                if (!form.supplier) return true;
                                                const pSuppId = (typeof p.supplier === 'object' && p.supplier !== null) ? p.supplier.id : p.supplier;
                                                return String(pSuppId) === String(form.supplier);
                                            })} 
                                            value={it.product} 
                                            onChange={(val) => updateItem(i, 'product', val)} 
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <select value={it.packaging_type} onChange={(e) => updateItem(i, 'packaging_type', e.target.value)} className="w-full border border-gray-300 rounded-[2px] p-1.5 text-[11px] font-bold outline-none">
                                            <option value="SINGLE">Unit</option>
                                            <option value="CARTON">Carton</option>
                                        </select>
                                        {it.packaging_type === 'CARTON' && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-[9px] text-gray-400 font-bold uppercase">Pcs:</span>
                                                <input type="number" value={it.items_per_carton} onChange={(e) => updateItem(i, 'items_per_carton', e.target.value)} className="w-full border border-gray-200 rounded p-1 text-[10px] text-center font-bold" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-1">
                                        <input type="number" min="1" value={it.quantity} onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 0)} className="w-full border border-gray-300 rounded-[2px] p-2 text-center text-[14px] font-black" />
                                        <div className="text-[9px] text-emerald-600 font-bold text-center mt-1 uppercase">Total: {it.packaging_type === 'CARTON' ? (it.quantity * it.items_per_carton) : it.quantity} Pcs</div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="relative">
                                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-300 font-bold text-[10px]">Rs.</span>
                                            <input type="number" step="0.01" value={it.price} onChange={(e) => updateItem(i, 'price', parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded-[2px] p-2 text-right text-[13px] font-black pr-2 pl-6" />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="relative">
                                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-300 font-bold text-[10px]">Rs.</span>
                                            <input type="number" step="0.01" value={it.selling_price} onChange={(e) => updateItem(i, 'selling_price', parseFloat(e.target.value) || 0)} className="w-full border border-gray-300 rounded-[2px] p-2 text-right text-[13px] font-black bg-emerald-50 pr-2 pl-6" />
                                        </div>
                                    </div>
                                    <div className="col-span-1 text-right">
                                        <button type="button" onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-500 mt-2 transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addItem} className="w-full py-2 bg-gray-50 border-t text-[11px] font-black text-gray-500 hover:bg-white flex items-center justify-center gap-1 uppercase tracking-widest transition-all active:bg-gray-100">
                            <Plus size={14} strokeWidth={3} /> Add Line Position
                        </button>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 uppercase">Internal Commercial Notes</label>
                        <textarea rows={2} value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} className="w-full border border-gray-300 rounded-[2px] p-3 text-[13px] outline-none focus:border-[#e77600] h-20 resize-none" placeholder="Enter settlement terms or specific batch instructions..." />
                    </div>
                </div>

                {/* Economic Hub Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-50 border border-gray-300 p-6 rounded-sm space-y-6 sticky top-8 shadow-sm">
                        <div>
                            <h2 className="text-[17px] font-bold text-gray-900 border-b pb-3 mb-6 uppercase tracking-tight">Settlement Info</h2>
                            <div className="space-y-4">
                                <div className="flex justify-between text-[13px]">
                                    <span className="text-gray-500 font-bold uppercase tracking-tight">Assets Value</span>
                                    <span className="font-black text-gray-900">{formatCurrency(itemsTotal)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[13px]">
                                    <span className="text-gray-500 font-bold uppercase tracking-tight">Freight Cost</span>
                                    <input type="number" value={form.shipping_cost} onChange={(e) => setForm({...form, shipping_cost: parseFloat(e.target.value) || 0})} className="w-24 border border-gray-300 rounded-sm p-1.5 text-right font-black text-[14px]" />
                                </div>
                                <div className="flex justify-between items-center text-[13px]">
                                    <span className="text-gray-500 font-bold uppercase tracking-tight">Fiscal Tax</span>
                                    <input type="number" value={form.tax_amount} onChange={(e) => setForm({...form, tax_amount: parseFloat(e.target.value) || 0})} className="w-24 border border-gray-300 rounded-sm p-1.5 text-right font-black text-[14px]" />
                                </div>
                                <div className="border-t border-gray-300 pt-6 mt-6">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="text-[14px] font-black text-gray-900 uppercase">Net Liability</span>
                                        <span className="text-2xl font-black text-[#b12704] leading-none shrink-0">{formatCurrency(grandTotal)}</span>
                                    </div>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase text-right tracking-widest mt-2 italic opacity-70">Verified commercial settlement</p>
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={saving} 
                            className="w-full bg-[#f0c14b] border border-[#a88734] hover:bg-[#e7bb41] text-gray-900 py-3 rounded-[3px] font-black shadow-sm text-[13px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                        >
                            {saving ? 'Synchronizing...' : 'Place Order'}
                        </button>

                        <div className="bg-white border border-gray-200 rounded p-4 space-y-3">
                             <label className="text-[10px] font-black text-gray-400 block uppercase tracking-widest">Liability Profile</label>
                             <select value={form.payment_status} onChange={(e) => setForm({...form, payment_status: e.target.value})} className="w-full bg-gray-50 border border-gray-300 rounded-[2px] p-2 text-[12px] font-black outline-none">
                                <option value="UNPAID">UNPAID (Open)</option>
                                <option value="PARTIAL">PARTIAL SETTLE</option>
                                <option value="PAID">PAID (Clear)</option>
                             </select>
                        </div>
                    </div>
                </div>
            </form>
            
            <div className="mt-40 pt-10 border-t border-gray-100 flex flex-col items-center">
                <div className="flex gap-10 text-[10px] text-gray-300 font-black uppercase tracking-[0.3em] mb-4">
                    <span>Ledger Privacy</span>
                    <span>Commercial Terms</span>
                    <span>Systems Proxy</span>
                </div>
                <p className="text-[9px] text-gray-200 font-bold uppercase tracking-[0.8em]">Al-Qavi Distributor Management Ecosystem Proxy</p>
            </div>
        </div>
    );
}

