'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAdminAuth } from '@/hooks';
import { productService, orderService, userService } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
    ShoppingCart, Search, Plus, Minus, Trash2,
    Package, Printer, CreditCard, Banknote, RefreshCw, X, Clock,
    ShoppingBag, Loader2, ArrowLeft, Check, AlertCircle, Eye, Info,
    User, Calendar, CreditCard as CardIcon, LayoutGrid, List,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { 
    PageHeader, SectionCard, SectionHeader, Toast, 
    AMZ_INPUT, AMZ_LABEL, PrimaryButton, SecondaryButton, ActionButton 
} from '@/components/ui/AmazonStyles';

/* ══════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════ */
interface CartItem {
    product: any;
    quantity: number;
}

interface CardDetails {
    name: string;
    number: string;
    expiry: string;
    cvv: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export default function PointOfSalePage() {
    const { isAuthenticated } = useAdminAuth();

    // Data State
    const [products, setProducts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [categories, setCategories] = useState<string[]>(['All']);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [guestName, setGuestName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' or 'card'
    const [showCardModal, setShowCardModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [cardDetails, setCardDetails] = useState<CardDetails | null>(null);

    // Checkout State
    const [isProcessing, setIsProcessing] = useState(false);
    const [successOrder, setSuccessOrder] = useState<any | null>(null);

    // Live Clock State
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Data Load (extracted so Refresh button can call it without full page reload)
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadData = useCallback(async (silent = false) => {
        if (silent) setIsRefreshing(true); else setLoading(true);
        try {
            const [p, u] = await Promise.all([
                productService.getAll?.({ all_items: 'true' } as any) ?? Promise.resolve([]),
                userService.getAll?.().catch((e: any) => {
                    console.warn('POS: Standard customers could not be loaded from server. Using guest mode.', e.message);
                    return [];
                }) ?? Promise.resolve([])
            ]);

            const prodArray = Array.isArray(p) ? p : (p as any)?.results || [];
            setProducts(prodArray.filter((prod: any) => prod.is_active !== false));

            // Filter users to only show customers
            const userArray = Array.isArray(u) ? u : (u as any)?.results || [];
            const customersOnly = userArray.filter((user: any) => {
                const roleName = (user.role_name || (typeof user.role === 'string' ? user.role : (user.role?.name || ''))).toLowerCase();
                const isAdmin = roleName === 'admin' || user.username?.toLowerCase() === 'admin';
                const isCustomerRole = !user.role || roleName === 'customer' || roleName === '';
                return isCustomerRole && !isAdmin;
            });
            setUsers(customersOnly);

            // Extract unique categories
            const cats = new Set<string>();
            prodArray.forEach((prod: any) => {
                const c = prod.category_name || prod.category?.name || prod.category;
                if (c && typeof c === 'string') cats.add(c);
            });
            if (cats.size > 0) setCategories(['All', ...Array.from(cats)]);
            else setCategories(['All']);

            if (silent) showToast('Station data refreshed.');
        } catch (e) {
            console.error("Failed to load POS data", e);
            if (silent) showToast('Refresh failed.', 'error');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    // Initial Data Load
    useEffect(() => { loadData(); }, [loadData]);

    // Filtered Products
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.barcode?.toLowerCase() === searchQuery.toLowerCase();
            const cat = p.category_name || p.category?.name || p.category;
            const matchesCategory = selectedCategory === 'All' || cat === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, selectedCategory]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredProducts, currentPage, ITEMS_PER_PAGE]);

    // Reset to page 1 when filter/search changes
    const handleSearchChange = (val: string) => { setSearchQuery(val); setCurrentPage(1); };
    const handleCategoryChange = (val: string) => { setSelectedCategory(val); setCurrentPage(1); };

    // Handle Barcode Scanner
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchQuery.trim() !== '') {
            const q = searchQuery.trim().toLowerCase();
            const exactProduct = products.find(p => p.sku?.toLowerCase() === q || p.barcode?.toLowerCase() === q);
            if (exactProduct) {
                addToCart(exactProduct);
                setSearchQuery('');
                showToast(`Added ${exactProduct.name}`);
            }
        }
    };

    // Cart Operations
    const addToCart = (product: any) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            const stock = parseInt(product.stock ?? product.quantity_in_stock ?? 0);

            if (existing) {
                if (existing.quantity >= stock && stock > 0) {
                    showToast("Out of stock!", "error");
                    return prev;
                }
                return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }

            if (stock <= 0) {
                showToast("Item out of stock!", "error");
                return prev;
            }

            return [{ product, quantity: 1 }, ...prev];
        });
    };

    const updateQuantity = (productId: string | number, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const stock = parseInt(item.product.stock ?? item.product.quantity_in_stock ?? 0);
                const newQty = Math.max(1, item.quantity + delta);
                if (stock > 0 && newQty > stock) {
                    showToast("Cannot exceed available stock", "error");
                    return item;
                }
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (productId: string | number) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const clearCart = () => {
        if (window.confirm('Clear all items from the current tray?')) setCart([]);
    };

    // Derived Values
    const cartSubtotal = cart.reduce((sum, item) => sum + (parseFloat(item.product.price || 0) * item.quantity), 0);
    const cartTotal = cartSubtotal;
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Checkout
    const handleCompleteSale = async (bypassConfirm: boolean = false) => {
        if (cart.length === 0) return showToast('Transaction tray is empty.', 'error');
        
        if (paymentMethod === 'card' && !cardDetails) {
            setShowCardModal(true);
            return;
        }

        if (!bypassConfirm) {
            setShowConfirmModal(true);
            return;
        }

        setIsProcessing(true);
        try {
            const payload = {
                order_number: `POS-${Date.now().toString().slice(-6)}`,
                total_amount: cartTotal,
                status: 'delivered',
                payment_status: 'completed',
                payment_method: paymentMethod === 'cash' ? 'Cash' : 'Card',
                notes: `POS Sale - Paid via ${paymentMethod} ${cardDetails ? `(Card: ****${cardDetails.number.slice(-4)})` : ''}`,
                customer: customerId ? Number(customerId) : null,
                guest_name: !customerId ? guestName || 'Walk-in Customer' : '',
                items: cart.map(i => ({
                    product_id: i.product?.id,
                    product_name: i.product?.name,
                    quantity: i.quantity,
                    price: i.product?.price || 0
                }))
            };

            const newOrder = await orderService.create(payload);
            setSuccessOrder({ ...payload, id: newOrder?.id || Date.now(), created_at: new Date().toISOString() });
            setCart([]);
            setCardDetails(null);
            showToast("Sale completed successfully!");

        } catch (error: any) {
            console.error('Checkout failed', error);
            const errMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Transaction could not be authorized.';
            showToast(`Transaction Failed: ${errMsg}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const resetPOS = () => {
        setCart([]);
        setCustomerId(null);
        setGuestName('');
        setPaymentMethod('cash');
        setSearchQuery('');
        setSuccessOrder(null);
        setCardDetails(null);
        setShowConfirmModal(false);
    };

    if (!isAuthenticated) return null;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-[#FF9900] animate-spin" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Initalizing POS Station...</p>
            </div>
        );
    }

    // Success Screen
    if (successOrder) {
        return (
            <div className="max-w-[1200px] mx-auto py-12 px-4 animate-in fade-in duration-500">
                <SectionCard className="max-w-xl mx-auto text-center p-12 relative">
                    <div className="mb-6 flex justify-center">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                            <Check className="w-10 h-10" strokeWidth={3} />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Transaction Successful</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-8 font-medium">Order #{successOrder.order_number} has been processed.</p>

                    <div className="bg-[#fcfcfc] dark:bg-slate-800/50 border border-[#ddd] dark:border-slate-700 rounded p-6 mb-8 text-left">
                        <div className="flex justify-between mb-4 pb-4 border-b border-[#eee] dark:border-slate-700">
                            <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-tight">Amount Received</span>
                            <span className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(successOrder.total_amount)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Method</p>
                                <p className="text-sm font-bold text-gray-700 dark:text-slate-300 capitalize">{paymentMethod}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Customer</p>
                                <p className="text-sm font-bold text-gray-700 dark:text-slate-300 truncate">{successOrder.guest_name || 'Registered Profile'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 noprint mt-8">
                        <button 
                            onClick={() => window.print()} 
                            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors uppercase tracking-widest text-xs"
                        >
                            <Printer className="w-5 h-5" /> Print Invoice
                        </button>
                        <PrimaryButton onClick={resetPOS} className="flex-1 !py-3">
                            <Plus className="w-5 h-5" /> Next Transaction
                        </PrimaryButton>
                    </div>
                </SectionCard>

                {/* Printable Receipt (Minimalist Black & White) */}
                <div id="receipt-print-area" className="printable-receipt bg-white text-black p-4 font-sans uppercase tracking-tight">
                    <div className="max-w-[148mm] mx-auto border-t-2 border-black pt-4">
                        {/* Header */}
                        <div className="text-center mb-6">
                            <h1 className="text-xl font-black mb-1">AL-QAVI COSMETIC HUB</h1>
                            <p className="text-[10px] font-bold">Sales Receipt / Invoice</p>
                            <p className="text-[9px] font-medium mt-1">Email: support@aqt-trades.com</p>
                        </div>

                        {/* Order Details */}
                        <div className="grid grid-cols-2 gap-4 text-[10px] font-bold mb-6 pb-4 border-b border-black">
                            <div className="space-y-1">
                                <p>Order No: {successOrder.order_number}</p>
                                <p>Date: {new Date(successOrder.created_at).toLocaleString()}</p>
                            </div>
                            <div className="text-right space-y-1">
                                <p>Customer: {successOrder.guest_name || 'Walk-in'}</p>
                                <p>Payment: {successOrder.payment_method}</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <table className="w-full text-left text-[10px] mb-6 border-collapse">
                            <thead>
                                <tr className="border-b border-black">
                                    <th className="py-2 px-1 font-black w-8">QTY</th>
                                    <th className="py-2 px-1 font-black">ITEM DESCRIPTION</th>
                                    <th className="py-2 px-1 font-black text-right w-20">UNIT</th>
                                    <th className="py-2 px-1 font-black text-right w-20">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody className="font-bold">
                                {successOrder.items?.map((item: any, idx: number) => (
                                    <tr key={idx} className="border-b border-gray-100">
                                        <td className="py-2 px-1">{item.quantity}</td>
                                        <td className="py-2 px-1 text-[9px] truncate">{item.product_name}</td>
                                        <td className="py-2 px-1 text-right">{formatCurrency(item.price)}</td>
                                        <td className="py-2 px-1 text-right">{formatCurrency(item.price * item.quantity)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals Section */}
                        <div className="flex justify-end pt-2 mb-8">
                            <div className="w-48 text-[10px] font-black space-y-2">
                                <div className="flex justify-between border-b border-gray-100 pb-1">
                                    <span>SUBTOTAL</span>
                                    <span>{formatCurrency(successOrder.total_amount)}</span>
                                </div>
                                <div className="flex justify-between text-base pt-1">
                                    <span>TOTAL</span>
                                    <span>{formatCurrency(successOrder.total_amount)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Section */}
                        <div className="text-center pt-8 border-t border-black text-[9px] font-bold">
                            <p className="mb-2 italic font-black">THANK YOU FOR YOUR BUSINESS!</p>
                            <p className="opacity-70 italic tracking-widest">RETURNS SUBJECT TO STORE POLICY</p>
                            <div className="mt-8 flex justify-between items-center text-[7px] text-gray-400">
                                <span>AUTHENTIC ORIGINAL RECEIPT</span>
                                <span>{new Date().toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <style jsx global>{`
                    .printable-receipt {
                        display: none;
                    }
                    @media print {
                        @page { margin: 10mm; size: portrait; }
                        body { background: white !important; color: black !important; margin: 0 !important; padding: 0 !important; }
                        .noprint, nav, header, aside, .fixed, .absolute, .toast, .amazon-style-toast, button { display: none !important; }
                        body * { visibility: hidden; }
                        #receipt-print-area, #receipt-print-area * { visibility: visible !important; }
                        #receipt-print-area {
                            display: block !important;
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            box-sizing: border-box;
                        }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto px-4 py-6 font-sans">
            {/* Amazon Style Toast Feedback */}
            <Toast message={toast?.msg || ''} />

            {/* Header Module */}
            <PageHeader
                title="POS"
                subtitle={`Station Active: ● ONLINE • ${currentTime.toLocaleTimeString()}`}
                icon={ShoppingCart}
                action={
                    <SecondaryButton onClick={() => loadData(true)} disabled={isRefreshing}>
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh Station'}
                    </SecondaryButton>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* ── LEFT: Catalog ── */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Catalog Controls */}
                    <SectionCard>
                        <div className="p-4 flex flex-col md:flex-row gap-4 items-center">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    value={searchQuery}
                                    onChange={e => handleSearchChange(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    placeholder="Scan barcode or search items..."
                                    className={AMZ_INPUT}
                                />
                            </div>
                            <select
                                value={selectedCategory}
                                onChange={e => handleCategoryChange(e.target.value)}
                                className={AMZ_INPUT + " md:w-48"}
                            >
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                            {/* View Toggle */}
                            <div className="flex items-center border border-[#D5D9D9] dark:border-slate-700 rounded overflow-hidden flex-shrink-0">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    title="Grid View"
                                    className={`px-3 py-2 transition-colors ${
                                        viewMode === 'grid'
                                            ? 'bg-[#131921] text-[#f0c14b]'
                                            : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    title="List View"
                                    className={`px-3 py-2 transition-colors border-l border-[#D5D9D9] dark:border-slate-700 ${
                                        viewMode === 'list'
                                            ? 'bg-[#131921] text-[#f0c14b]'
                                            : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Catalog — Grid View */}
                    {viewMode === 'grid' && (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {paginatedProducts.length === 0 ? (
                                <div className="col-span-full py-24 text-center bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 rounded">
                                    <Package className="w-12 h-12 text-gray-200 dark:text-slate-800 mx-auto mb-4" />
                                    <p className="text-sm font-bold text-gray-400 dark:text-slate-600 uppercase tracking-widest">No matching items found</p>
                                </div>
                            ) : (
                                paginatedProducts.map(p => {
                                    const stock = parseInt(p.stock ?? p.quantity_in_stock ?? 0);
                                    const inCart = cart.find(i => i.product.id === p.id)?.quantity || 0;
                                    const isOutOfStock = stock <= 0;
                                    return (
                                        <button
                                            key={p.id}
                                            disabled={isOutOfStock}
                                            onClick={() => addToCart(p)}
                                            className={`group relative flex flex-col items-start bg-white dark:bg-slate-900 border rounded transition-all text-left
                                                ${isOutOfStock ? 'opacity-50 cursor-not-allowed border-gray-100'
                                                    : inCart > 0 ? 'border-[#e77600] shadow-[0_0_3px_2px_rgba(228,121,17,0.5)]'
                                                        : 'border-[#D5D9D9] dark:border-slate-800 hover:border-[#e77600] hover:shadow-sm'}`}
                                        >
                                            {inCart > 0 && (
                                                <div className="absolute top-2 right-2 bg-[#e77600] text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                                                    {inCart}
                                                </div>
                                            )}
                                            <div className="w-full aspect-square p-4 flex items-center justify-center bg-gray-50/50 dark:bg-slate-800/50">
                                                {p.image ? (
                                                    <img src={p.image} className="max-w-full max-h-full object-contain mix-blend-multiply dark:mix-blend-normal" alt="" />
                                                ) : (
                                                    <Package className="w-10 h-10 text-gray-200 dark:text-slate-700" />
                                                )}
                                            </div>
                                            <div className="p-3 w-full border-t border-[#eee] dark:border-slate-800">
                                                <h3 className="text-[12px] font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 h-9 mb-2">{p.name}</h3>
                                                <div className="flex justify-between items-end">
                                                    <p className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">{formatCurrency(p.price)}</p>
                                                    <p className={`text-[9px] font-bold uppercase tracking-wider ${stock < 5 ? 'text-red-600' : 'text-gray-500'}`}>
                                                        {stock} Stock
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* Catalog — List / Table View */}
                    {viewMode === 'list' && (
                        <div className="bg-white dark:bg-slate-900 border border-[#ddd] dark:border-slate-800 rounded overflow-hidden">
                            {paginatedProducts.length === 0 ? (
                                <div className="py-24 text-center">
                                    <Package className="w-12 h-12 text-gray-200 dark:text-slate-800 mx-auto mb-4" />
                                    <p className="text-sm font-bold text-gray-400 dark:text-slate-600 uppercase tracking-widest">No matching items found</p>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead className="bg-[#f3f3f3] dark:bg-slate-800 border-b border-[#ddd] dark:border-slate-700">
                                        <tr>
                                            <th className="py-3 px-4 text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest w-12"></th>
                                            <th className="py-3 px-4 text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">Product</th>
                                            <th className="py-3 px-4 text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest hidden md:table-cell">SKU</th>
                                            <th className="py-3 px-4 text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest hidden md:table-cell">Category</th>
                                            <th className="py-3 px-4 text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest text-right">Price</th>
                                            <th className="py-3 px-4 text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest text-right">Stock</th>
                                            <th className="py-3 px-4 text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#eee] dark:divide-slate-800">
                                        {paginatedProducts.map(p => {
                                            const stock = parseInt(p.stock ?? p.quantity_in_stock ?? 0);
                                            const inCart = cart.find(i => i.product.id === p.id)?.quantity || 0;
                                            const isOutOfStock = stock <= 0;
                                            const cat = p.category_name || p.category?.name || p.category || '—';
                                            return (
                                                <tr
                                                    key={p.id}
                                                    className={`group transition-colors ${
                                                        isOutOfStock
                                                            ? 'opacity-50 bg-gray-50 dark:bg-slate-900/60'
                                                            : inCart > 0
                                                                ? 'bg-orange-50 dark:bg-orange-900/10'
                                                                : 'bg-white dark:bg-slate-900 hover:bg-[#fff8f0] dark:hover:bg-slate-800/60'
                                                    }`}
                                                >
                                                    {/* Thumbnail */}
                                                    <td className="py-2 px-4">
                                                        <div className="w-10 h-10 rounded border border-[#eee] dark:border-slate-800 flex items-center justify-center bg-gray-50 dark:bg-slate-800 overflow-hidden">
                                                            {p.image ? (
                                                                <img src={p.image} className="max-w-full max-h-full object-contain" alt="" />
                                                            ) : (
                                                                <Package className="w-5 h-5 text-gray-200 dark:text-slate-700" />
                                                            )}
                                                        </div>
                                                    </td>
                                                    {/* Name */}
                                                    <td className="py-2 px-4">
                                                        <p className="text-[13px] font-bold text-gray-900 dark:text-white leading-tight truncate max-w-[200px]">{p.name}</p>
                                                        {inCart > 0 && (
                                                            <span className="inline-block mt-0.5 text-[9px] font-black text-[#e77600] uppercase tracking-widest">
                                                                {inCart} in tray
                                                            </span>
                                                        )}
                                                    </td>
                                                    {/* SKU */}
                                                    <td className="py-2 px-4 hidden md:table-cell">
                                                        <span className="text-[11px] font-mono text-gray-400 dark:text-slate-500">{p.sku || '—'}</span>
                                                    </td>
                                                    {/* Category */}
                                                    <td className="py-2 px-4 hidden md:table-cell">
                                                        <span className="inline-block text-[10px] font-bold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">{cat}</span>
                                                    </td>
                                                    {/* Price */}
                                                    <td className="py-2 px-4 text-right">
                                                        <span className="text-[13px] font-bold text-gray-900 dark:text-white">{formatCurrency(p.price)}</span>
                                                    </td>
                                                    {/* Stock */}
                                                    <td className="py-2 px-4 text-right">
                                                        <span className={`text-[11px] font-bold ${
                                                            isOutOfStock ? 'text-red-500' : stock < 5 ? 'text-orange-500' : 'text-emerald-600'
                                                        }`}>
                                                            {isOutOfStock ? 'Out' : stock}
                                                        </span>
                                                    </td>
                                                    {/* Add Button */}
                                                    <td className="py-2 px-4 text-center">
                                                        <button
                                                            disabled={isOutOfStock}
                                                            onClick={() => addToCart(p)}
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wide border transition-all ${
                                                                isOutOfStock
                                                                    ? 'cursor-not-allowed border-gray-200 text-gray-300 dark:border-slate-700 dark:text-slate-600'
                                                                    : inCart > 0
                                                                        ? 'bg-[#e77600] border-[#e77600] text-white hover:bg-[#d06a00]'
                                                                        : 'bg-white dark:bg-slate-800 border-[#e77600] text-[#e77600] hover:bg-[#e77600] hover:text-white'
                                                            }`}
                                                        >
                                                            <Plus className="w-3 h-3" /> Add
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* Pagination */}
                    {filteredProducts.length > ITEMS_PER_PAGE && (
                        <div className="flex items-center justify-between px-1">
                            <p className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                                Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredProducts.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length} items
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded border border-[#D5D9D9] dark:border-slate-700 text-[11px] font-bold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(pg => pg === 1 || pg === totalPages || Math.abs(pg - currentPage) <= 1)
                                    .reduce<(number | '...')[]>((acc, pg, idx, arr) => {
                                        if (idx > 0 && (pg as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                                        acc.push(pg);
                                        return acc;
                                    }, [])
                                    .map((pg, idx) =>
                                        pg === '...' ? (
                                            <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-[11px] font-bold">…</span>
                                        ) : (
                                            <button
                                                key={pg}
                                                onClick={() => setCurrentPage(pg as number)}
                                                className={`min-w-[32px] py-1.5 rounded border text-[11px] font-bold transition-all ${
                                                    currentPage === pg
                                                        ? 'bg-[#131921] border-[#131921] text-[#f0c14b]'
                                                        : 'bg-white dark:bg-slate-800 border-[#D5D9D9] dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                {pg}
                                            </button>
                                        )
                                    )
                                }

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded border border-[#D5D9D9] dark:border-slate-700 text-[11px] font-bold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    Next <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── RIGHT: Tray ── */}
                <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">

                    <SectionCard>
                        <SectionHeader title="Transaction Tray" icon={ShoppingBag} />

                        {/* Tray Setup */}
                        <div className="p-4 border-b border-[#eee] dark:border-slate-800 bg-[#fcfcfc] dark:bg-slate-900/50 space-y-4">
                            <div>
                                <label className={AMZ_LABEL}>Customer Profile</label>
                                <select
                                    value={customerId || ''}
                                    onChange={e => setCustomerId(e.target.value || null)}
                                    className={AMZ_INPUT}
                                >
                                    <option value="">Guest / Walk-in Customer</option>
                                    {users.map((u: any) => (
                                        <option key={u.id} value={u.id}>
                                            {u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.email || u.username}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {!customerId && (
                                <div className="animate-in slide-in-from-top-2">
                                    <label className={AMZ_LABEL}>Guest Name</label>
                                    <input
                                        type="text"
                                        value={guestName}
                                        onChange={e => setGuestName(e.target.value)}
                                        placeholder="Identification Reference"
                                        className={AMZ_INPUT}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Tray Items */}
                        <div className="max-h-[400px] overflow-y-auto divide-y divide-[#eee] dark:divide-slate-800">
                            {cart.length === 0 ? (
                                <div className="py-20 text-center px-4">
                                    <ShoppingCart className="w-10 h-10 text-gray-100 dark:text-slate-800 mx-auto mb-3" />
                                    <p className="text-xs font-bold text-gray-300 dark:text-slate-600 uppercase tracking-widest leading-loose">
                                        Scan items or click catalog<br />to begin transaction
                                    </p>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.product.id} className="p-4 flex gap-3 group bg-white dark:bg-slate-900">
                                        <div className="w-12 h-12 rounded border border-[#eee] dark:border-slate-800 flex-shrink-0 p-1 flex items-center justify-center bg-white dark:bg-slate-800">
                                            {item.product.image ? (
                                                <img src={item.product.image} className="max-w-full max-h-full object-contain" alt="" />
                                            ) : (
                                                <Package className="w-6 h-6 text-gray-100 dark:text-slate-700" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[12px] font-bold text-gray-800 dark:text-white truncate mb-1">{item.product.name}</h4>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center border border-[#adb1b8] dark:border-slate-600 rounded-[3px] shadow-sm overflow-hidden scale-90 origin-left bg-white dark:bg-slate-800">
                                                    <button onClick={() => updateQuantity(item.product.id, -1)} className="px-2 py-1 bg-gray-50 dark:bg-slate-800 border-r border-[#adb1b8] dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600">
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <span className="px-3 text-xs font-bold text-gray-900 dark:text-white bg-white dark:bg-slate-800 min-w-[30px] text-center">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.product.id, 1)} className="px-2 py-1 bg-gray-50 dark:bg-slate-800 border-l border-[#adb1b8] dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600">
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(parseFloat(item.product.price) * item.quantity)}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => removeFromCart(item.product.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Tray Finance */}
                        <div className="p-6 bg-[#fcfcfc] dark:bg-slate-900/50 border-t border-[#eee] dark:border-slate-800">
                            <div className="flex justify-between items-center mb-6">
                                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-none">Subtotal ({totalItems} items)</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{formatCurrency(cartTotal)}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-6">
                                <button
                                    onClick={() => setPaymentMethod('cash')}
                                    className={`py-2 px-3 rounded text-[10px] font-bold uppercase tracking-wide border transition-all flex items-center justify-center gap-2 shadow-sm
                                        ${paymentMethod === 'cash' 
                                            ? 'bg-[#131921] border-[#131921] text-[#f0c14b]' 
                                            : 'bg-white dark:bg-slate-800 border-[#ddd] dark:border-slate-700 text-gray-500 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                                >
                                    <Banknote className="w-3 h-3" /> Cash
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('card')}
                                    className={`py-2 px-3 rounded text-[10px] font-bold uppercase tracking-wide border transition-all flex items-center justify-center gap-2 shadow-sm
                                        ${paymentMethod === 'card' 
                                            ? 'bg-[#131921] border-[#131921] text-[#f0c14b]' 
                                            : 'bg-white dark:bg-slate-800 border-[#ddd] dark:border-slate-700 text-gray-500 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                                >
                                    <CreditCard className="w-3 h-3" /> Card / UPI
                                </button>
                            </div>

                            <PrimaryButton
                                disabled={cart.length === 0 || isProcessing}
                                onClick={() => handleCompleteSale()}
                                className="w-full !py-3 !text-[13px] uppercase tracking-wide shadow-md disabled:opacity-40"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processing Order
                                    </>
                                ) : (
                                    <>Authorize Payment</>
                                )}
                            </PrimaryButton>

                            {cart.length > 0 && (
                                <button onClick={clearCart} className="w-full text-[10px] font-bold text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 uppercase tracking-widest mt-4">
                                    Clear Current Tray
                                </button>
                            )}
                        </div>
                    </SectionCard>
                </div>
            </div>

            {/* Card Information Modal (Amazon Style) */}
            {showCardModal && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700 max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                <CardIcon className="h-4 w-4 text-[#e47911]" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Card Information</h3>
                            </div>
                            <button onClick={() => setShowCardModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className={AMZ_LABEL}>Cardholder Name</label>
                                <input 
                                    type="text" 
                                    className={AMZ_INPUT} 
                                    placeholder="Full name as on card"
                                    onChange={e => setCardDetails(prev => ({ ...(prev || { name: '', number: '', expiry: '', cvv: '' }), name: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className={AMZ_LABEL}>Card Number</label>
                                <input 
                                    type="text" 
                                    className={AMZ_INPUT} 
                                    placeholder="XXXX XXXX XXXX XXXX" 
                                    maxLength={16}
                                    onChange={e => setCardDetails(prev => ({ ...(prev || { name: '', number: '', expiry: '', cvv: '' }), number: e.target.value }))}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={AMZ_LABEL}>Expiry</label>
                                    <input 
                                        type="text" 
                                        className={AMZ_INPUT} 
                                        placeholder="MM/YY" 
                                        maxLength={5} 
                                        onChange={e => setCardDetails(prev => ({ ...(prev || { name: '', number: '', expiry: '', cvv: '' }), expiry: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className={AMZ_LABEL}>CVV</label>
                                    <input 
                                        type="password" 
                                        className={AMZ_INPUT} 
                                        placeholder="***" 
                                        maxLength={3} 
                                        onChange={e => setCardDetails(prev => ({ ...(prev || { name: '', number: '', expiry: '', cvv: '' }), cvv: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="pt-2">
                                <PrimaryButton 
                                    onClick={() => { if (cardDetails?.number) { setShowCardModal(false); setShowConfirmModal(true); } }} 
                                    className="w-full !py-2 uppercase tracking-wide"
                                >
                                    Confirm Card Details
                                </PrimaryButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Final Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded border border-gray-300 dark:border-slate-700 max-w-sm w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                                {paymentMethod === 'cash' ? <Banknote className="h-4 w-4 text-[#e47911]" /> : <CreditCard className="h-4 w-4 text-[#e47911]" />}
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                                    Confirm {paymentMethod === 'cash' ? 'Cash' : 'Card'} Sale
                                </h3>
                            </div>
                            <button onClick={() => setShowConfirmModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 text-orange-600">
                                    <Info className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                                        Authorize {formatCurrency(cartTotal)}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                                        {paymentMethod === 'cash' 
                                            ? "Confirm completion of this transaction via cash payment." 
                                            : `Confirm charge to card ending in ****${cardDetails?.number?.slice(-4)}.`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <PrimaryButton 
                                    onClick={() => { setShowConfirmModal(false); handleCompleteSale(true); }} 
                                    className="w-full !py-2.5 uppercase tracking-wide"
                                >
                                    Authorize Now
                                </PrimaryButton>
                                <SecondaryButton 
                                    onClick={() => {
                                        setShowConfirmModal(false);
                                        if (paymentMethod === 'card') setShowCardModal(true);
                                    }} 
                                    className="w-full !py-2 text-[11px] uppercase tracking-wider font-bold"
                                >
                                    {paymentMethod === 'card' ? 'Edit Card Info' : 'Go Back'}
                                </SecondaryButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
