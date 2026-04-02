'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    ShoppingCart, Plus, Trash2,
    CheckCircle, AlertTriangle, Package, Loader2, ArrowLeft, Save,
    Activity, Filter, Calendar, DollarSign, ArrowRight, ShieldCheck, Clipboard
} from 'lucide-react';
import { purchaseService } from '@/services/purchase.service';
import { productService } from '@/services/product.service';
import { companyService } from '@/services/company.service';
import { formatCurrency, formatDate } from '@/lib/utils';

// ── Shared Utilities (MISSION CONTROL DESIGN) ───────────────────────────────
const LABEL = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">{children}</label>
);

const INPUT = ({ ...props }) => (
    <input 
        {...props} 
        className={`w-full px-5 py-3 bg-white/95 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white outline-none focus:border-[#1D4ED8]/50 transition-all shadow-sm placeholder:text-slate-300 ${props.className || ''}`} 
    />
);

const SELECT = `w-full px-5 py-3 bg-white/95 dark:bg-[#0D1921]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white outline-none focus:border-[#1D4ED8]/50 transition-all shadow-xl shadow-[#1D4ED8]/5 cursor-pointer disabled:opacity-50`;

const SectionCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white/95 dark:bg-[#0D1921]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl shadow-[#1D4ED8]/5 overflow-hidden ${className}`}>
        {children}
    </div>
);

const SectionHeader = ({ title, icon: Icon, action }: { title: string; icon?: any; action?: React.ReactNode }) => (
    <div className="px-10 py-6 bg-[#fcfcfc] dark:bg-white/5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
            {Icon && <Icon className="w-5 h-5 text-[#1D4ED8] stroke-[2.5]" />}
            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">{title}</span>
        </div>
        {action}
    </div>
);

type LineItem = { product: any; product_name: string; quantity: number; unit_price: number };

export default function EditPurchasePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    
    const [products, setProducts] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [form, setForm] = useState<any>({
        purchase_number: '', supplier_name: '', supplier_phone: '',
        order_date: '', expected_delivery_date: '', 
        tax_amount: '0', shipping_cost: '0',
        status: 'draft', payment_status: 'pending', notes: '',
    });
    const [items, setItems] = useState<LineItem[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'alert' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'alert' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [prodsRes, compsRes, purchaseData] = await Promise.all([
                productService.getAll?.({ all_items: 'true' } as any) ?? Promise.resolve([]),
                companyService.getAll(),
                purchaseService.getById(id)
            ]);

            setProducts(Array.isArray(prodsRes) ? prodsRes : (prodsRes as any)?.results || []);
            setCompanies(Array.isArray(compsRes) ? compsRes : []);

            setForm({
                purchase_number: purchaseData.purchase_number || '',
                supplier_name: purchaseData.supplier_name || '',
                supplier_phone: purchaseData.supplier_phone || '',
                order_date: purchaseData.order_date || '',
                expected_delivery_date: purchaseData.expected_delivery_date || '',
                tax_amount: purchaseData.tax_amount || '0',
                shipping_cost: purchaseData.shipping_cost || '0',
                status: purchaseData.status || 'draft',
                payment_status: purchaseData.payment_status || 'pending',
                notes: purchaseData.notes || '',
            });

            if (purchaseData.items && Array.isArray(purchaseData.items)) {
                setItems(purchaseData.items.map((item: any) => ({
                    product: item.product,
                    product_name: item.product_name || '',
                    quantity: item.quantity || 0,
                    unit_price: item.unit_price || 0
                })));
            } else {
                setItems([{ product: '', product_name: '', quantity: 1, unit_price: 0 }]);
            }

        } catch (e) {
            showToast('Failed to load data', 'alert');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { loadData(); }, [loadData]);

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.purchase_number) e.purchase_number = 'Required';
        if (!form.supplier_name) e.supplier_name = 'Required';
        if (!form.order_date) e.order_date = 'Required';
        if (items.some(i => !i.product || i.quantity < 1 || i.unit_price <= 0))
            e.items = 'Manifest error: All items require product, quantity ≥ 1, and valuation.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const lineTotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
            const total_amount = lineTotal + parseFloat(form.tax_amount || '0') + parseFloat(form.shipping_cost || '0');
            
            await purchaseService.update(id, { ...form, items, total_amount });
            showToast('Purchase protocol synchronized successfully!');
            setTimeout(() => router.push('/admin/purchases'), 1500);
        } catch (e: any) {
            showToast(e?.response?.data?.error || 'Registry update failed', 'alert');
        } finally {
            setSaving(false);
        }
    };

    const addItem = () => setItems(prev => [...prev, { product: '', product_name: '', quantity: 1, unit_price: 0 }]);
    const removeItem = (i: number) => setItems(prev => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
    
    const updateItem = (i: number, field: string, val: any) => {
        setItems(prev => prev.map((item, idx) => {
            if (idx !== i) return item;
            if (field === 'product') {
                const p = products.find(p => p.id === val || p.id === Number(val));
                return { 
                    ...item, 
                    product: val, 
                    product_name: p?.name || '', 
                    unit_price: p?.price ? parseFloat(p.price) : item.unit_price 
                };
            }
            return { ...item, [field]: val };
        }));
    };

    const lineTotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
    const grandTotal = lineTotal + parseFloat(form.tax_amount || '0') + parseFloat(form.shipping_cost || '0');

    if (loading) {
        return (
            <div className="flex flex-col h-[70vh] items-center justify-center gap-6 animate-pulse">
                <div className="w-16 h-16 bg-[#1D4ED8]/10 rounded-[2rem] flex items-center justify-center text-[#1D4ED8]">
                    <Loader2 className="h-10 w-10 animate-spin" />
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Recalibrating Procurement Registry...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto pb-24 px-4 mt-6 animate-in fade-in duration-700 font-sans text-left">
            
            {/* Tactical Header */}
            <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8 leading-none">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2 leading-none">Update Protocol</h1>
                    <div className="flex items-center gap-3 leading-none">
                        <span className="flex items-center gap-1.5 text-[10px] font-black text-[#1D4ED8] uppercase tracking-widest leading-none">
                            <ShoppingCart className="w-3.5 h-3.5" strokeWidth={3} /> Registry Edit Mode
                        </span>
                        <div className="w-1 h-1 bg-slate-200 dark:bg-white/10 rounded-full" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">PO: {form.purchase_number}</span>
                    </div>
                </div>
                <button onClick={() => router.push('/admin/purchases')} className="px-6 py-3 bg-white/95 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all flex items-center gap-2 active:scale-95 leading-none">
                    <ArrowLeft className="w-3.5 h-3.5 stroke-[3]" /> Back to Registry
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Form Layers */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* Module A: Metadata */}
                    <SectionCard>
                        <SectionHeader title="Purchase Parameters" icon={Clipboard} />
                        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <LABEL>PO Registry ID *</LABEL>
                                <INPUT 
                                    value={form.purchase_number}
                                    onChange={(e: any) => setForm((f: any) => ({ ...f, purchase_number: e.target.value }))}
                                    className={errors.purchase_number ? 'border-rose-500' : ''}
                                />
                                {errors.purchase_number && <p className="text-rose-500 text-[9px] font-black uppercase tracking-widest leading-none">Required Component</p>}
                            </div>
                            <div className="space-y-2">
                                <LABEL>Supplier Entity *</LABEL>
                                <select
                                    value={form.supplier_name}
                                    onChange={e => {
                                        const val = e.target.value;
                                        const matched = companies.find(c => c.name === val);
                                        setForm((f: any) => ({
                                            ...f,
                                            supplier_name: val,
                                            supplier_phone: matched ? (matched.phone || matched.whatsapp || '') : f.supplier_phone,
                                        }));
                                    }}
                                    className={SELECT}
                                >
                                    <option value="">Select Origin Supplier</option>
                                    {companies.map((c: any) => (
                                        <option key={`${c.id}-${c.name}`} value={c.name}>{c.name}{c.city ? ` [${c.city}]` : ''}</option>
                                    ))}
                                </select>
                                {errors.supplier_name && <p className="text-rose-500 text-[9px] font-black uppercase tracking-widest leading-none">Supplier Disconnected</p>}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-8 md:col-span-2">
                                <div className="space-y-2 border-t border-slate-100 dark:border-white/5 pt-8">
                                    <LABEL>Contact Proxy</LABEL>
                                    <INPUT value={form.supplier_phone} onChange={(e: any) => setForm((f: any) => ({ ...f, supplier_phone: e.target.value }))} placeholder="+92-XXX-XXXXXXX" />
                                </div>
                                <div className="space-y-2 border-t border-slate-100 dark:border-white/5 pt-8">
                                    <LABEL>Registry Date *</LABEL>
                                    <INPUT type="date" value={form.order_date} onChange={(e: any) => setForm((f: any) => ({ ...f, order_date: e.target.value }))} className={errors.order_date ? 'border-rose-500' : ''} />
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Module B: Item Manifest */}
                    <SectionCard>
                        <SectionHeader title="Operational Manifest" icon={Package} action={
                            <button onClick={addItem} className="px-4 py-2 bg-[#1D4ED8]/10 text-[#1D4ED8] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#1D4ED8] hover:text-white transition-all flex items-center gap-2 leading-none">
                                <Plus className="w-3 h-3 stroke-[3]" /> Append Resource Row
                            </button>
                        } />
                        <div className="p-10">
                            {errors.items && <p className="text-rose-500 text-[10px] mb-6 font-black uppercase tracking-widest text-center py-4 bg-rose-50 dark:bg-rose-500/5 rounded-2xl">{errors.items}</p>}
                            <div className="space-y-6">
                                {items.map((item, i) => (
                                    <div key={i} className="flex flex-col md:flex-row gap-6 items-end p-6 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] rounded-[2rem] relative group hover:border-[#1D4ED8]/30 transition-all">
                                        <div className="flex-1 w-full space-y-2">
                                            <LABEL>System Asset</LABEL>
                                            <select value={item.product} onChange={e => updateItem(i, 'product', e.target.value)} className={SELECT}>
                                                <option value="">Locate Asset Base...</option>
                                                {products
                                                    .filter(p => !form.supplier_name || p.company_name === form.supplier_name)
                                                    .map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                                                }
                                            </select>
                                        </div>
                                        <div className="w-full md:w-32 space-y-2">
                                            <LABEL>Quantity</LABEL>
                                            <INPUT type="number" value={item.quantity} onChange={(e: any) => updateItem(i, 'quantity', parseInt(e.target.value) || 0)} className="text-center" />
                                        </div>
                                        <div className="w-full md:w-48 space-y-2">
                                            <LABEL>Unit Valuation</LABEL>
                                            <div className="relative">
                                                <INPUT type="number" value={item.unit_price} onChange={(e: any) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} className="pl-10" />
                                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                            </div>
                                        </div>
                                        <button onClick={() => removeItem(i)} className="p-3 text-slate-300 hover:text-rose-500 transition-colors bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:-translate-y-1 shadow-sm leading-none">
                                            <Trash2 className="w-4.5 h-4.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </SectionCard>
                </div>

                {/* Right Column: Summaries & Controls */}
                <div className="lg:col-span-4 space-y-8">
                    
                    {/* Module C: Registry State */}
                    <SectionCard className="p-10 space-y-8">
                        <div className="flex items-center gap-3 mb-2">
                            <Activity className="w-5 h-5 text-emerald-500 stroke-[2.5]" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white leading-none">Registry Overrides</h3>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <LABEL>Order Phase</LABEL>
                                <select value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))} className={SELECT}>
                                    <option value="draft">Internal Draft</option>
                                    <option value="ordered">Active Order</option>
                                    <option value="received">Registry Finalized</option>
                                    <option value="cancelled">Void Transaction</option>
                                </select>
                            </div>
                            <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-white/5">
                                <LABEL>Projected Arrival</LABEL>
                                <INPUT type="date" value={form.expected_delivery_date} onChange={(e: any) => setForm((f: any) => ({ ...f, expected_delivery_date: e.target.value }))} />
                            </div>
                        </div>
                    </SectionCard>

                    {/* Module D: Revenue Matrix */}
                    <SectionCard className="border-[#1D4ED8]/20 ring-4 ring-[#1D4ED8]/5">
                        <SectionHeader title="Financial Matrix" icon={DollarSign} />
                        <div className="p-10 space-y-8">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-slate-400">
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Manifest Value</span>
                                    <span className="text-xs font-black text-slate-900 dark:text-white leading-none tabular-nums">{formatCurrency(lineTotal)}</span>
                                </div>
                                <div className="flex flex-col gap-6 pt-6 border-t border-slate-100 dark:border-white/5">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <LABEL>logistics</LABEL>
                                            <INPUT type="number" value={form.shipping_cost} onChange={(e: any) => setForm((f: any) => ({ ...f, shipping_cost: e.target.value }))} />
                                        </div>
                                        <div className="space-y-2">
                                            <LABEL>Registry Tax</LABEL>
                                            <INPUT type="number" value={form.tax_amount} onChange={(e: any) => setForm((f: any) => ({ ...f, tax_amount: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <LABEL>Settlement State</LABEL>
                                        <select value={form.payment_status} onChange={e => setForm((f: any) => ({ ...f, payment_status: e.target.value }))} className={SELECT}>
                                            <option value="pending">Awaiting Funds</option>
                                            <option value="partially_paid">Partial Settlement</option>
                                            <option value="paid">Accounts Cleared</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="pt-8 border-t border-slate-100 dark:border-white/5 flex flex-col items-center gap-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Registry Valuation</p>
                                <p className="text-4xl font-black text-[#1D4ED8] tracking-tighter tabular-nums leading-none">{formatCurrency(grandTotal)}</p>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full py-5 bg-[#1D4ED8] text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" strokeWidth={3} />}
                                {saving ? 'Synchronizing...' : 'Commit Registry Changes'}
                            </button>
                        </div>
                    </SectionCard>
                </div>
            </div>

            {/* Tactical Toast Overlay */}
            {toast && (
                <div className="fixed bottom-10 right-10 z-[250] animate-in slide-in-from-right-10 duration-500">
                    <div className={`${toast.type === 'success' ? 'bg-[#1D4ED8]' : 'bg-rose-500'} text-white px-8 py-5 rounded-[2.5rem] shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-xl border border-white/10`}>
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                            {toast.type === 'success' ? <CheckCircle className="h-5 w-5 text-white stroke-[3]" /> : <AlertTriangle className="h-5 w-5 text-white stroke-[3]" />}
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] leading-none">{toast.msg}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
