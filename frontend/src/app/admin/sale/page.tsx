'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAdminAuth } from '@/hooks';
import { productService, orderService, userService } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
    ShoppingCart, Search, Plus, Minus, Trash2,
    Package, Printer, CreditCard, Banknote, RefreshCw, X,
    ShoppingBag, Loader2, Check, AlertCircle,
    LayoutGrid, List, ChevronLeft, ChevronRight, Zap,
    CreditCard as CardIcon
} from 'lucide-react';

interface CartItem { product: any; quantity: number; }
interface CardDetails { name: string; number: string; expiry: string; cvv: string; }

const fieldCls = `w-full px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] focus:ring-2 focus:ring-[#F7CA00]/10 transition-all placeholder:text-slate-400 text-slate-800 dark:text-slate-200`;

export default function PointOfSalePage() {
    const { isAuthenticated } = useAdminAuth();

    const [products, setProducts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [categories, setCategories] = useState<string[]>(['All']);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 12;

    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [guestName, setGuestName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [showCardModal, setShowCardModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [cardDetails, setCardDetails] = useState<CardDetails | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [successOrder, setSuccessOrder] = useState<any | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadData = useCallback(async (silent = false) => {
        if (silent) setIsRefreshing(true); else setLoading(true);
        try {
            const [p, u] = await Promise.all([
                productService.getAll?.({ all_items: 'true' } as any) ?? Promise.resolve([]),
                userService.getAll?.().catch(() => []) ?? Promise.resolve([])
            ]);
            const prodArray = Array.isArray(p) ? p : (p as any)?.results || [];
            setProducts(prodArray.filter((prod: any) => prod.is_active !== false));
            const userArray = Array.isArray(u) ? u : (u as any)?.results || [];
            const customersOnly = userArray.filter((u: any) => {
                if (u.is_active === false) return false;
                const rName = (u.role_name || (typeof u.role === 'string' ? u.role : (u.role?.name || ''))).toLowerCase();
                if (u.is_superuser || u.is_staff) return false;
                if (['admin', 'supplier', 'manager'].includes(rName)) return false;
                if (u.username?.toLowerCase() === 'admin') return false;
                return true;
            });
            setUsers(customersOnly);
            const cats = new Set<string>();
            prodArray.forEach((prod: any) => {
                const c = prod.category_name || prod.category?.name || prod.category;
                if (c && typeof c === 'string') cats.add(c);
            });
            setCategories(['All', ...Array.from(cats)]);
            if (silent) showToast('Refreshed.');
        } catch { if (silent) showToast('Refresh failed.', 'error'); }
        finally { setLoading(false); setIsRefreshing(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const filteredProducts = useMemo(() =>
        products.filter(p => {
            const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.barcode?.toLowerCase() === searchQuery.toLowerCase();
            const cat = p.category_name || p.category?.name || p.category;
            const matchesCategory = selectedCategory === 'All' || cat === selectedCategory;
            return matchesSearch && matchesCategory;
        }), [products, searchQuery, selectedCategory]);

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredProducts, currentPage, ITEMS_PER_PAGE]);

    const handleSearchChange = (val: string) => { setSearchQuery(val); setCurrentPage(1); };
    const handleCategoryChange = (val: string) => { setSelectedCategory(val); setCurrentPage(1); };

    const addToCart = (product: any) => {
        setCart(prev => {
            const existing = prev.find(i => i.product.id === product.id);
            const stock = parseInt(product.stock ?? product.quantity_in_stock ?? 0);
            if (existing) {
                if (existing.quantity >= stock && stock > 0) { showToast('Insufficient stock', 'error'); return prev; }
                return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            if (stock <= 0) { showToast('Out of stock', 'error'); return prev; }
            return [{ product, quantity: 1 }, ...prev];
        });
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            const exactProduct = products.find(p => p.sku?.toLowerCase() === q || p.barcode?.toLowerCase() === q);
            if (exactProduct) { addToCart(exactProduct); setSearchQuery(''); showToast(`Added: ${exactProduct.name}`); }
        }
    };

    const updateQuantity = (productId: string | number, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id !== productId) return item;
            const stock = parseInt(item.product.stock ?? item.product.quantity_in_stock ?? 0);
            const currentQty = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0;
            const newQty = Math.max(1, currentQty + delta);
            if (stock > 0 && newQty > stock) { showToast('Stock limit reached', 'error'); return item; }
            return { ...item, quantity: newQty };
        }));
    };

    const updateQuantityManual = (productId: string | number, value: string) => {
        setCart(prev => prev.map(item => {
            if (item.product.id !== productId) return item;
            if (value === '') return { ...item, quantity: '' as any };
            let val = parseInt(value, 10);
            if (isNaN(val)) return item;
            const stock = parseInt(item.product.stock ?? item.product.quantity_in_stock ?? 0);
            if (stock > 0 && val > stock) {
                val = stock;
                showToast(`Maximum stock limit is ${stock}`, 'error');
            }
            return { ...item, quantity: val };
        }));
    };

    const handleQuantityBlur = (productId: string | number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id !== productId) return item;
            let val = typeof item.quantity === 'string' ? parseInt(item.quantity, 10) : item.quantity;
            if (isNaN(val) || val < 1) val = 1;
            return { ...item, quantity: val };
        }));
    };

    const removeFromCart = (productId: string | number) => setCart(prev => prev.filter(i => i.product.id !== productId));
    const clearCart = () => setCart([]);

    const cartTotal = cart.reduce((sum, i) => sum + (parseFloat(i.product.price || 0) * (Number(i.quantity) || 0)), 0);
    const totalItems = cart.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

    const handleCompleteSale = async (bypassConfirm = false) => {
        if (cart.length === 0) return showToast('Cart is empty.', 'error');
        if (paymentMethod === 'card' && !cardDetails) { setShowCardModal(true); return; }
        if (!bypassConfirm) { setShowConfirmModal(true); return; }
        setIsProcessing(true);
        try {
            const payload = {
                order_number: `POS-${Date.now().toString().slice(-6)}`,
                total_amount: cartTotal,
                status: 'delivered',
                payment_status: 'completed',
                payment_method: paymentMethod === 'cash' ? 'Cash' : 'Card',
                notes: `POS Sale - ${paymentMethod}${cardDetails ? ` (****${cardDetails.number.slice(-4)})` : ''}`,
                customer: customerId ? Number(customerId) : null,
                guest_name: !customerId ? guestName || 'Walk-in' : '',
                items: cart.map(i => ({ product_id: i.product?.id, product_name: i.product?.name, quantity: i.quantity, price: i.product?.price || 0 }))
            };
            const newOrder = await orderService.create(payload);
            setSuccessOrder({ ...payload, id: newOrder?.id || Date.now(), created_at: new Date().toISOString() });
            setCart([]); setCardDetails(null);
            showToast('Sale completed.');
        } catch { showToast('Transaction failed.', 'error'); }
        finally { setIsProcessing(false); }
    };

    const resetPOS = () => { setCart([]); setCustomerId(null); setGuestName(''); setPaymentMethod('cash'); setSearchQuery(''); setSuccessOrder(null); setCardDetails(null); setShowConfirmModal(false); };

    if (!isAuthenticated) return null;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="h-8 w-8 text-[#F7CA00] animate-spin" />
                <p className="text-sm text-slate-500">Initializing POS terminal...</p>
            </div>
        );
    }

    // ── Success screen ──────────────────────────────────────────────────────────
    if (successOrder) {
        return (
            <div className="max-w-lg mx-auto py-12 px-4 font-sans">
                <div className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                            <Check className="h-8 w-8 text-emerald-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Sale Complete</h2>
                        <p className="text-sm text-slate-500 mb-6">Order #{successOrder.order_number}</p>

                        <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-lg p-4 text-left mb-6">
                            <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-200 dark:border-white/10">
                                <span className="text-sm text-slate-500">Total Amount</span>
                                <span className="text-2xl font-bold text-[#F7CA00]">{formatCurrency(successOrder.total_amount)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Payment Method</p>
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${paymentMethod === 'cash' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                                        {paymentMethod === 'cash' ? 'Cash' : 'Card'}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400 mb-1">Customer</p>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{successOrder.guest_name || 'Registered'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 transition-colors">
                                <Printer className="h-4 w-4" /> Print Receipt
                            </button>
                            <button onClick={resetPOS} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-[#F7CA00] hover:bg-blue-700 rounded-lg shadow-sm transition-colors">
                                <Plus className="h-4 w-4" /> New Sale
                            </button>
                        </div>
                    </div>
                </div>

                {/* Printable receipt */}
                <div id="receipt-print-area" className="printable-receipt bg-white text-black p-8 font-sans">
                    <div className="max-w-[80mm] mx-auto border-t-4 border-black pt-8">
                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-black">AL-QAVI COSMETIC</h1>
                            <p className="text-xs font-bold tracking-widest uppercase mt-1">POS Terminal Invoice</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold mb-6 pb-4 border-b border-black">
                            <div><p>Order: #{successOrder.order_number}</p><p>Date: {new Date(successOrder.created_at).toLocaleDateString()}</p></div>
                            <div className="text-right"><p>Customer: {successOrder.guest_name || 'Walk-in'}</p><p>Method: {successOrder.payment_method}</p></div>
                        </div>
                        <table className="w-full text-[10px] mb-6 border-collapse">
                            <thead><tr className="border-b border-black"><th className="py-1.5 text-left font-bold w-8">QTY</th><th className="py-1.5 text-left font-bold">ITEM</th><th className="py-1.5 text-right font-bold w-20">TOTAL</th></tr></thead>
                            <tbody>{successOrder.items?.map((item: any, idx: number) => (
                                <tr key={idx} className="border-b border-gray-100">
                                    <td className="py-2">{item.quantity}</td>
                                    <td className="py-2 text-[9px]">{item.product_name}</td>
                                    <td className="py-2 text-right">{formatCurrency(String(item.price * item.quantity))}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                        <div className="flex justify-between font-black border-t-2 border-black pt-2 text-base mb-6">
                            <span>TOTAL</span><span>{formatCurrency(String(successOrder.total_amount))}</span>
                        </div>
                        <div className="text-center text-[9px] font-bold uppercase tracking-widest border-t border-black pt-4">
                            <p>Thank you for your business</p>
                        </div>
                    </div>
                </div>
                <style jsx global>{`
                    .printable-receipt { display: none; }
                    @media print {
                        @page { margin: 0; size: auto; }
                        body { background: white !important; color: black !important; margin: 0 !important; }
                        .no-print, nav, header, aside, button { display: none !important; }
                        #receipt-print-area { display: block !important; }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="max-w-[1700px] mx-auto px-4 py-4 font-sans">

            {/* ── Toast ── */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[500] animate-in slide-in-from-bottom-4 duration-300">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-[#F7CA00]' : 'bg-red-600'}`}>
                        {toast.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                        {toast.msg}
                    </div>
                </div>
            )}

            {/* ── Page Header ── */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#F7CA00]/10 rounded-lg flex items-center justify-center text-[#F7CA00]">
                        <ShoppingCart className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white">POS Terminal</h1>
                        <p className="text-xs text-slate-500">{currentTime.toLocaleTimeString()}</p>
                    </div>
                </div>
                <button onClick={() => loadData(true)} disabled={isRefreshing} className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 hover:text-[#F7CA00] transition-all disabled:opacity-50">
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-[#F7CA00]' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

                {/* ── LEFT: Product Catalog ── */}
                <div className="lg:col-span-8 space-y-4">

                    {/* Search / Category / View Toggle */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                value={searchQuery}
                                onChange={e => handleSearchChange(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Search or scan barcode / SKU..."
                                className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] focus:ring-2 focus:ring-[#F7CA00]/10 transition-all placeholder:text-slate-400"
                            />
                        </div>
                        <select
                            value={selectedCategory}
                            onChange={e => handleCategoryChange(e.target.value)}
                            className="px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <div className="flex items-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
                            <button onClick={() => setViewMode('grid')} className={`px-3 py-2 transition-colors ${viewMode === 'grid' ? 'bg-[#F7CA00] text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button onClick={() => setViewMode('list')} className={`px-3 py-2 transition-colors ${viewMode === 'list' ? 'bg-[#F7CA00] text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                                <List className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Product Grid / List */}
                    <div className="min-h-[500px]">
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                {paginatedProducts.map(p => {
                                    const stock = parseInt(p.stock ?? p.quantity_in_stock ?? 0);
                                    const inCart = cart.find(i => i.product.id === p.id)?.quantity || 0;
                                    const isOutOfStock = stock <= 0;
                                    return (
                                        <button
                                            key={p.id}
                                            disabled={isOutOfStock}
                                            onClick={() => addToCart(p)}
                                            className={`group relative flex flex-col bg-white dark:bg-[#1B1C1E] border rounded-xl transition-all text-left overflow-hidden shadow-sm
                                                ${isOutOfStock ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:border-[#F7CA00]/50 hover:shadow-md hover:-translate-y-0.5'}
                                                ${inCart > 0 ? 'border-[#F7CA00] ring-2 ring-[#F7CA00]/10' : 'border-slate-200 dark:border-white/10'}`}
                                        >
                                            <div className="aspect-square flex items-center justify-center bg-slate-50 dark:bg-white/5 relative p-4">
                                                {p.image ? (
                                                    <img src={p.image} className="max-w-full max-h-full object-contain" alt="" />
                                                ) : <Package className="h-10 w-10 text-slate-200 dark:text-white/10" />}
                                                {inCart > 0 && (
                                                    <div className="absolute top-2 right-2 w-6 h-6 bg-[#F7CA00] text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                                                        {inCart}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3 flex-1 flex flex-col">
                                                <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 mb-2 flex-1">{p.name}</h3>
                                                <div className="flex justify-between items-end">
                                                    <span className="text-sm font-bold text-[#F7CA00]">{formatCurrency(p.price)}</span>
                                                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${stock < 5 ? 'text-red-600 bg-red-50' : 'text-emerald-700 bg-emerald-50'}`}>
                                                        {stock}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-left">Product</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-right">Price</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-right">Stock</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-center">Add</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {paginatedProducts.map(p => {
                                            const stock = parseInt(p.stock ?? p.quantity_in_stock ?? 0);
                                            return (
                                                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center p-1.5">
                                                                {p.image ? <img src={p.image} className="max-w-full max-h-full object-contain" alt="" /> : <Package className="h-4 w-4 text-slate-300" />}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.name}</p>
                                                                <p className="text-xs text-slate-400">SKU: {String(p.sku || p.id).slice(-8)}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold text-[#F7CA00]">{formatCurrency(p.price)}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${stock < 5 ? 'text-red-600 bg-red-50' : 'text-emerald-700 bg-emerald-50'}`}>{stock}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button onClick={() => addToCart(p)} disabled={stock <= 0} className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-[#F7CA00] hover:text-white transition-colors disabled:opacity-30">
                                                            <Plus className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">Page {currentPage} of {totalPages}</p>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 disabled:opacity-30 hover:text-slate-800 transition-colors">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 disabled:opacity-30 hover:text-slate-800 transition-colors">
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: Cart Panel ── */}
                <div className="lg:col-span-4 lg:sticky lg:top-4">
                    <div className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden">

                        {/* Customer selector */}
                        <div className="p-4 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                            <div className="flex items-center gap-2 mb-3">
                                <ShoppingBag className="h-4 w-4 text-[#F7CA00]" />
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Sale Cart</h3>
                                {totalItems > 0 && <span className="ml-auto text-xs font-semibold px-2 py-0.5 bg-[#F7CA00]/10 text-[#F7CA00] rounded-full">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>}
                            </div>
                            <div className="space-y-2">
                                <select
                                    value={customerId || ''}
                                    onChange={e => setCustomerId(e.target.value || null)}
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] text-slate-700 dark:text-slate-300 cursor-pointer"
                                >
                                    <option value="">Guest / Walk-in</option>
                                    {users.map((u: any) => (
                                        <option key={u.id} value={u.id}>
                                            {u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.email || u.username}
                                        </option>
                                    ))}
                                </select>
                                {!customerId && (
                                    <input
                                        value={guestName}
                                        onChange={e => setGuestName(e.target.value)}
                                        placeholder="Guest name (optional)"
                                        className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-[#F7CA00] placeholder:text-slate-400"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Cart items */}
                        <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                            {cart.length === 0 ? (
                                <div className="py-12 text-center px-6">
                                    <ShoppingCart className="h-12 w-12 text-slate-200 dark:text-white/10 mx-auto mb-3" />
                                    <p className="text-sm text-slate-400">No items in cart</p>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.product.id} className="flex gap-3 p-3 items-start">
                                        <div className="w-10 h-10 rounded-lg border border-slate-100 dark:border-white/10 flex-shrink-0 flex items-center justify-center bg-slate-50 dark:bg-white/5">
                                            {item.product.image ? <img src={item.product.image} className="max-w-full max-h-full object-contain" alt="" /> : <Package className="h-4 w-4 text-slate-300" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mb-1.5">{item.product.name}</p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
                                                    <button onClick={() => updateQuantity(item.product.id, -1)} className="px-2 py-1 text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                        <Minus className="h-3 w-3" />
                                                    </button>
                                                    <input 
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => updateQuantityManual(item.product.id, e.target.value)}
                                                        onBlur={() => handleQuantityBlur(item.product.id)}
                                                        className="w-10 px-1 py-1 text-xs font-semibold text-center text-slate-700 dark:text-slate-300 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                    <button onClick={() => updateQuantity(item.product.id, 1)} className="px-2 py-1 text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                        <Plus className="h-3 w-3" />
                                                    </button>
                                                </div>
                                                <span className="text-sm font-semibold text-[#F7CA00]">{formatCurrency(String(parseFloat(item.product.price || 0) * (Number(item.quantity) || 0)))}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => removeFromCart(item.product.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Checkout area */}
                        <div className="p-4 bg-slate-900 dark:bg-slate-950 border-t border-white/10">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs text-white/50">Total Amount</span>
                                <span className="text-2xl font-bold text-white tabular-nums">{formatCurrency(String(cartTotal))}</span>
                            </div>

                            {/* Payment method */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <button
                                    onClick={() => setPaymentMethod('cash')}
                                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors border
                                        ${paymentMethod === 'cash' ? 'bg-white text-slate-900 border-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'}`}
                                >
                                    <Banknote className="h-4 w-4" /> Cash
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('card')}
                                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors border
                                        ${paymentMethod === 'card' ? 'bg-white text-slate-900 border-white' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'}`}
                                >
                                    <CardIcon className="h-4 w-4" /> Card
                                </button>
                            </div>

                            <button
                                onClick={() => handleCompleteSale()}
                                disabled={cart.length === 0 || isProcessing}
                                className="w-full py-2.5 bg-[#F7CA00] text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-30 shadow-lg shadow-blue-500/30"
                            >
                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" fill="currentColor" />}
                                {isProcessing ? 'Processing...' : 'Complete Sale'}
                            </button>

                            {cart.length > 0 && (
                                <button onClick={clearCart} className="w-full text-xs text-white/20 hover:text-red-400 mt-3 transition-colors">
                                    Clear cart
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Card Modal ── */}
            {showCardModal && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCardModal(false)} />
                    <div className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl max-w-sm w-full shadow-xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
                            <div className="flex items-center gap-2">
                                <CardIcon className="h-4 w-4 text-[#F7CA00]" />
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Card Details</h3>
                            </div>
                            <button onClick={() => setShowCardModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Cardholder Name</label>
                                <input placeholder="Name on card" onChange={e => setCardDetails(prev => ({ ...(prev || { name: '', number: '', expiry: '', cvv: '' }), name: e.target.value }))} className={fieldCls} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Card Number</label>
                                <input placeholder="0000 0000 0000 0000" maxLength={16} onChange={e => setCardDetails(prev => ({ ...(prev || { name: '', number: '', expiry: '', cvv: '' }), number: e.target.value }))} className={fieldCls} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Expiry</label>
                                    <input placeholder="MM/YY" maxLength={5} onChange={e => setCardDetails(prev => ({ ...(prev || { name: '', number: '', expiry: '', cvv: '' }), expiry: e.target.value }))} className={fieldCls} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">CVV</label>
                                    <input type="password" placeholder="***" maxLength={3} onChange={e => setCardDetails(prev => ({ ...(prev || { name: '', number: '', expiry: '', cvv: '' }), cvv: e.target.value }))} className={fieldCls} />
                                </div>
                            </div>
                            <button
                                onClick={() => { if (cardDetails?.number) { setShowCardModal(false); setShowConfirmModal(true); } }}
                                className="w-full py-2.5 bg-[#F7CA00] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                Confirm Card
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Confirm Modal ── */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)} />
                    <div className="bg-white dark:bg-[#1B1C1E] border border-slate-200 dark:border-white/10 rounded-xl max-w-sm w-full shadow-xl relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 bg-[#F7CA00]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                {paymentMethod === 'cash' ? <Banknote className="h-7 w-7 text-[#F7CA00]" /> : <CardIcon className="h-7 w-7 text-[#F7CA00]" />}
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Confirm {paymentMethod === 'cash' ? 'Cash' : 'Card'} Payment</h3>
                            <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-lg p-4 my-4">
                                <p className="text-xs text-slate-500 mb-1">Total amount</p>
                                <p className="text-2xl font-bold text-[#F7CA00]">{formatCurrency(String(cartTotal))}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => { setShowConfirmModal(false); handleCompleteSale(true); }} className="w-full py-2.5 bg-[#F7CA00] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                                    Confirm & Complete
                                </button>
                                <button onClick={() => { setShowConfirmModal(false); if (paymentMethod === 'card') setShowCardModal(true); }} className="w-full py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                                    Go Back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
