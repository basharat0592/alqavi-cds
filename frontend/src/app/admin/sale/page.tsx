"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAdminAuth } from '@/hooks';
import { productService, orderService, userService } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
    ShoppingCart, Search, Plus, Minus, Trash2,
    Package, Printer, RefreshCw, X,
    ShoppingBag, CheckCircle2,
    LayoutGrid, List, ChevronRight, Activity, User, Banknote, CreditCard
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PURE AMAZON RETAIL DESIGN SYSTEM - SALES (POS)
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

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="w-full">
        <label className="block text-[13px] font-bold text-[#0f1111] mb-1">{label}</label>
        {children}
    </div>
);

const inputCls = "w-full h-[31px] px-3 border border-[#888c8e] rounded-[3px] text-[13px] outline-none focus:border-[#e77600] focus:shadow-[0_0_3px_2px_rgba(228,121,17,0.5)] placeholder:text-[#aaa] bg-white transition-all";
const selectCls = `${inputCls} cursor-pointer`;

export default function PointOfSalePage() {
    const { isAuthenticated } = useAdminAuth();
    const [products, setProducts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [categories, setCategories] = useState<string[]>(['All']);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const [cart, setCart] = useState<any[]>([]);
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [guestName, setGuestName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [successOrder, setSuccessOrder] = useState<any | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true); else setIsRefreshing(true);
        try {
            const [p, u] = await Promise.all([
                productService.getAll?.({ all_items: 'true' } as any) ?? Promise.resolve([]),
                userService.getAll?.().catch(() => []) ?? Promise.resolve([])
            ]);
            const prodArray = Array.isArray(p) ? p : (p as any)?.results || [];
            setProducts(prodArray.filter((prod: any) => prod.status === 'ACTIVE'));
            
            const userArray = Array.isArray(u) ? u : (u as any)?.results || [];
            setUsers(userArray.filter((u: any) => !u.is_superuser && !u.is_staff));

            const cats = new Set<string>();
            prodArray.forEach((prod: any) => {
                const c = prod.category_name || prod.category?.name || prod.category;
                if (c) cats.add(c);
            });
            setCategories(['All', ...Array.from(cats)]);
        } finally { setLoading(false); setIsRefreshing(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const filteredProducts = useMemo(() =>
        products.filter(p => {
            const matchesSearch = p.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
            const cat = p.category_name || p.category?.name || p.category;
            const matchesCategory = selectedCategory === 'All' || cat === selectedCategory;
            return matchesSearch && matchesCategory;
        }), [products, searchQuery, selectedCategory]);

    const addToCart = (product: any) => {
        setCart(prev => {
            const existing = prev.find(i => i.product.id === product.id);
            if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            return [{ product, quantity: 1 }, ...prev];
        });
    };

    const updateQuantity = (pid: any, delta: number) => {
        setCart(prev => prev.map(i => i.product.id === pid ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
    };

    const cartTotal = cart.reduce((sum, i) => sum + (parseFloat(i.product.selling_price || 0) * i.quantity), 0);

    const handleCompleteSale = async () => {
        if (cart.length === 0) return;
        setIsProcessing(true);
        try {
            const payload = {
                order_number: `POS-${Date.now().toString().slice(-6)}`,
                total_amount: cartTotal,
                status: 'delivered',
                payment_status: 'completed',
                payment_method: paymentMethod === 'cash' ? 'Cash' : 'Card',
                customer: customerId ? Number(customerId) : null,
                guest_name: !customerId ? guestName || 'Walk-in' : '',
                items: cart.map(i => ({ product_id: i.product.id, quantity: i.quantity, price: i.product.selling_price }))
            };
            await orderService.create(payload);
            setSuccessOrder({ ...payload, created_at: new Date().toISOString() });
            toast.success('Sale completed');
        } catch { toast.error('Failed to save sale'); } finally { setIsProcessing(false); }
    };

    if (!isAuthenticated) return null;

    if (successOrder) {
        return (
            <div className="bg-[#F8F9FA] min-h-screen flex items-center justify-center p-4">
                <div className="bg-white border border-[#ddd] rounded-[4px] p-12 max-w-lg w-full text-center shadow-xl animate-in zoom-in-95">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 text-green-600 border border-green-100 shadow-sm"><CheckCircle2 size={40} /></div>
                    <h2 className="text-[28px] font-normal text-[#111]">Success!</h2>
                    <p className="text-[14px] text-[#565959] mt-2 mb-8">Sale <span className="font-bold">#{successOrder.order_number}</span> has been saved.</p>
                    <div className="bg-[#fcfdff] border border-[#f3f3f3] rounded-[4px] p-6 mb-8 text-left">
                        <div className="flex justify-between items-center pb-4 border-b border-[#eee]">
                            <span className="text-[13px] font-bold text-[#565959]">Total Amount</span>
                            <span className="text-[24px] font-black text-[#111]">{formatCurrency(successOrder.total_amount)}</span>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <Btn variant="secondary" className="flex-1 h-[40px]" onClick={() => window.print()}><Printer size={18} /> Print</Btn>
                        <Btn className="flex-1 h-[40px]" onClick={() => { setSuccessOrder(null); setCart([]); }}><Plus size={18} /> New Sale</Btn>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-20 font-sans text-left">
            {/* Header */}
            <div className="bg-white border-b border-[#ddd] py-4 shadow-sm">
                <div className="max-w-[1400px] mx-auto px-6">
                    <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-3">
                        <Link href="/admin/dashboard" className="hover:text-[#c45500] hover:underline">Dashboard</Link>
                        <ChevronRight size={10} />
                        <span className="text-[#c45500]">New Sale</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-[22px] font-normal text-[#111]">New Sale</h1>
                            <p className="text-[13px] text-[#565959] mt-0.5">{currentTime.toLocaleTimeString()} • Active</p>
                        </div>
                        <Btn variant="secondary" onClick={() => loadData(true)} loading={isRefreshing}>
                            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Refresh
                        </Btn>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Products */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white border border-[#ddd] rounded-[4px] p-4 flex gap-4 shadow-sm items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search or scan barcode..." className={inputCls + " pl-10"} />
                        </div>
                        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className={selectCls + " w-[180px]"}>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="flex border border-[#ddd] rounded-[3px] overflow-hidden">
                            <button onClick={() => setViewMode('grid')} className={`p-1.5 transition-all ${viewMode==='grid'?'bg-[#111] text-white':'bg-white text-slate-400 hover:text-[#111]'}`}><LayoutGrid size={16} /></button>
                            <button onClick={() => setViewMode('list')} className={`p-1.5 transition-all ${viewMode==='list'?'bg-[#111] text-white':'bg-white text-slate-400 hover:text-[#111]'}`}><List size={16} /></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredProducts.map(p => (
                            <button key={p.id} onClick={() => addToCart(p)} className="bg-white border border-[#ddd] rounded-[4px] p-5 flex flex-col items-center gap-4 hover:border-[#e77600] transition-all group relative overflow-hidden text-center shadow-sm">
                                <div className="w-20 h-20 bg-[#fcfdff] rounded-[3px] flex items-center justify-center p-2">
                                    {p.image ? <img src={p.image} className="max-w-full max-h-full object-contain" /> : <Package className="text-slate-100" size={32} />}
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold text-[#111] line-clamp-1">{p.product_name}</p>
                                    <p className="text-[15px] font-bold text-[#c45500] mt-1">{formatCurrency(p.selling_price)}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cart */}
                <div className="lg:col-span-4 lg:sticky lg:top-4">
                    <div className="bg-white border border-[#ddd] rounded-[4px] shadow-sm overflow-hidden flex flex-col h-[650px]">
                        <div className="p-5 border-b border-[#ddd] flex items-center justify-between bg-[#f7f8fa]">
                            <h3 className="text-[15px] font-bold text-[#111] flex items-center gap-2"><ShoppingCart size={18} /> Shopping Cart</h3>
                            <button onClick={() => setCart([])} className="text-[11px] font-bold text-[#007185] hover:text-[#c45500] uppercase">Clear Cart</button>
                        </div>

                        <div className="flex-1 overflow-y-auto divide-y divide-[#eee] p-2">
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-4 opacity-50">
                                    <ShoppingBag size={48} strokeWidth={1} />
                                    <p className="text-[13px] italic">Cart is empty</p>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.product.id} className="p-3 flex gap-3 group">
                                        <div className="w-10 h-10 bg-[#f8f9fa] border border-[#eee] rounded-[2px] flex items-center justify-center">
                                            {item.product.image ? <img src={item.product.image} className="max-w-full max-h-full object-contain" /> : <Package className="text-slate-100" size={16} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-bold text-[#111] truncate">{item.product.product_name}</p>
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex items-center bg-[#f3f3f3] border border-[#ddd] rounded-[3px] text-[12px] font-bold">
                                                    <button onClick={() => updateQuantity(item.product.id, -1)} className="px-2 py-1 hover:text-[#c45500]"><Minus size={10} /></button>
                                                    <span className="w-8 text-center bg-white border-x border-[#ddd] py-1">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.product.id, 1)} className="px-2 py-1 hover:text-[#c45500]"><Plus size={10} /></button>
                                                </div>
                                                <span className="text-[14px] font-bold text-[#111]">{formatCurrency(item.product.selling_price * item.quantity)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-6 bg-[#0f1111] text-white">
                            <div className="flex items-center justify-between mb-6">
                                <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Total Amount</span>
                                <span className="text-[24px] font-bold text-[#ffd814]">{formatCurrency(cartTotal)}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <button onClick={() => setPaymentMethod('cash')} className={`flex items-center justify-center gap-2 py-2 rounded-[3px] border transition-all text-[11px] font-bold uppercase ${paymentMethod==='cash'?'bg-[#f0c14b] border-[#a88734] text-[#111]':'bg-white/10 border-white/10 text-slate-400'}`}><Banknote size={14} /> Cash</button>
                                <button onClick={() => setPaymentMethod('card')} className={`flex items-center justify-center gap-2 py-2 rounded-[3px] border transition-all text-[11px] font-bold uppercase ${paymentMethod==='card'?'bg-[#f0c14b] border-[#a88734] text-[#111]':'bg-white/10 border-white/10 text-slate-400'}`}><CreditCard size={14} /> Card</button>
                            </div>

                            <div className="space-y-3 mb-6">
                                <select value={customerId || ''} onChange={e => setCustomerId(e.target.value)} className="w-full h-[35px] px-3 bg-white/5 border border-white/10 rounded-[3px] text-[13px] text-white outline-none">
                                    <option value="">Guest Sale</option>
                                    {users.map((u: any) => <option key={u.id} value={u.id} className="text-[#111]">{u.first_name?`${u.first_name} ${u.last_name||''}`:u.email}</option>)}
                                </select>
                                {!customerId && <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Guest Name" className="w-full h-[35px] px-3 bg-white/5 border border-white/10 rounded-[3px] text-[13px] text-white outline-none" />}
                            </div>

                            <button onClick={handleCompleteSale} disabled={cart.length === 0 || isProcessing} className="w-full h-[40px] bg-[#f0c14b] hover:bg-[#e47911] text-[#111] rounded-[3px] font-bold text-[14px] uppercase tracking-widest transition-all disabled:opacity-30">
                                {isProcessing ? 'Saving...' : 'Complete Sale'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
