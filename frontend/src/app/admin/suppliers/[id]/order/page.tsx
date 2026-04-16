'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    ChevronLeft, ShoppingBag, Plus, Minus, 
    Trash2, Send, Package, Image as ImageIcon,
    RefreshCw, AlertCircle, Info, CheckCircle2
} from 'lucide-react';
import { supplierService } from '@/services/supplier.service';
import { getImageUrl, formatCurrency, cn } from '@/lib/utils';

export default function PurchaseOrderDeskPage() {
    const params = useParams();
    const router = useRouter();
    const [supplier, setSupplier] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Basket state
    const [basket, setBasket] = useState<any[]>([]);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        const loadPageData = async () => {
            setLoading(true);
            try {
                const [supRes, prodRes] = await Promise.all([
                    supplierService.getById(params.id as string),
                    supplierService.getSupplierProducts(params.id as string)
                ]);
                setSupplier(supRes);
                setProducts(prodRes);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (params.id) loadPageData();
    }, [params.id]);

    const addToBasket = (product: any) => {
        const existing = basket.find(item => item.product === product.id);
        if (existing) {
            setBasket(basket.map(item => 
                item.product === product.id 
                    ? { ...item, quantity: item.quantity + 1 } 
                    : item
            ));
        } else {
            setBasket([...basket, {
                product: product.id,
                name: product.product_name,
                image: product.image,
                quantity: 1,
                cost_price: parseFloat(product.cost_price || 0)
            }]);
        }
    };

    const updateQuantity = (productId: string, delta: number) => {
        setBasket(basket.map(item => {
            if (item.product === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const removeFromBasket = (productId: string) => {
        setBasket(basket.filter(item => item.product !== productId));
    };

    const basketTotal = basket.reduce((acc, item) => acc + (item.quantity * item.cost_price), 0);

    const handleSubmitOrder = async () => {
        if (basket.length === 0) return;
        setIsSubmitting(true);
        try {
            const payload = {
                supplier: params.id as string,
                notes,
                items: basket.map(item => ({
                    product: item.product,
                    quantity: item.quantity,
                    cost_price: item.cost_price
                }))
            };
            await supplierService.createOrder(payload);
            setBasket([]);
            setNotes('');
            alert("Purchase Order Submitted Successfully!");
            router.push('/admin/suppliers');
        } catch (err) {
            alert("Error submitting purchase order.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div className="h-[60vh] flex items-center justify-center">
            <RefreshCw className="h-10 w-10 text-amber-500 animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-6">
                <button 
                    onClick={() => router.back()}
                    className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-amber-600 transition-all shadow-sm"
                >
                    <ChevronLeft className="h-6 w-6" />
                </button>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ShoppingBag className="h-5 w-5 text-amber-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Restock Order Desk</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        {supplier?.name} <span className="text-slate-300 font-normal">/</span> <span className="text-slate-500">PO Generation</span>
                    </h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Product Catalog Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[#111] p-8 rounded-[40px] text-white flex items-center justify-between relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-xl font-black uppercase tracking-tight italic">Partner Catalog</h3>
                            <p className="text-zinc-500 text-xs font-bold mt-1 uppercase tracking-widest">Select items to include in your purchase manifest.</p>
                        </div>
                        <Package className="h-20 w-20 text-white/5 absolute -right-4 -bottom-4 rotate-12" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {products.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-slate-200">
                                <Package className="h-12 w-12 text-slate-100 mx-auto mb-4" />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                                    No B2B items found for this supplier. <br />They must add items to their catalog first.
                                </p>
                            </div>
                        ) : (
                            products.map((product) => (
                                <div key={product.id} className="bg-white rounded-3xl border border-slate-200 p-5 flex items-center gap-5 hover:border-amber-400 transition-all shadow-sm hover:shadow-xl group">
                                    <div className="h-20 w-20 bg-slate-50 rounded-2xl overflow-hidden border-2 border-slate-100 shrink-0">
                                        {product.image ? (
                                            <img src={getImageUrl(product.image)} alt="P" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                <ImageIcon className="h-6 w-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{product.product_name}</p>
                                        <p className="text-lg font-black text-amber-600 tracking-tight mt-1 small">PKR {parseFloat(product.cost_price).toLocaleString()}</p>
                                        <button 
                                            onClick={() => addToBasket(product)}
                                            className="mt-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-amber-600 transition-colors"
                                        >
                                            <Plus className="h-3 w-3" /> Add to Manifest
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Basket / Order Manifest Column */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden sticky top-8 flex flex-col h-[calc(100vh-4rem)]">
                        <div className="p-8 border-b border-slate-50">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4 text-center">Order Manifest</h3>
                            <div className="flex items-center justify-between text-slate-900">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Items Selected</span>
                                    <span className="text-2xl font-black">{basket.length} Unit Types</span>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                                    <ShoppingBag className="h-6 w-6" />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                            {basket.length === 0 ? (
                                <div className="py-20 text-center space-y-4">
                                    <AlertCircle className="h-10 w-10 text-slate-100 mx-auto" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase px-12 leading-loose">
                                        Your order manifest is currently empty. Select products from the catalog to restock.
                                    </p>
                                </div>
                            ) : (
                                basket.map((item) => (
                                    <div key={item.product} className="flex gap-4 animate-in slide-in-from-right-2 duration-300">
                                        <div className="h-12 w-12 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shrink-0">
                                            {item.image ? (
                                                <img src={getImageUrl(item.image)} alt="P" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                    <ImageIcon className="h-4 w-4" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="text-[11px] font-black text-slate-900 uppercase truncate pr-4">{item.name}</p>
                                                <button onClick={() => removeFromBasket(item.product)} className="text-slate-300 hover:text-red-500">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => updateQuantity(item.product, -1)} className="p-1 bg-slate-50 hover:bg-slate-100 rounded text-slate-400 border border-slate-100">-</button>
                                                    <span className="text-xs font-black text-slate-900">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.product, 1)} className="p-1 bg-slate-50 hover:bg-slate-100 rounded text-slate-400 border border-slate-100">+</button>
                                                </div>
                                                <p className="text-xs font-black text-slate-600">PKR {(item.quantity * item.cost_price).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-8 border-t border-slate-100 bg-slate-50/50 space-y-6">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Logistics Notes</label>
                                <textarea 
                                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-amber-500/10 placeholder:text-slate-300 resize-none"
                                    placeholder="Add instructions for supplier or accounting..."
                                    rows={2}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <p className="text-xs font-black text-slate-500 uppercase italic">Manifest Value</p>
                                <p className="text-2xl font-black text-slate-900 tracking-tighter">PKR {basketTotal.toLocaleString()}</p>
                            </div>

                            <button 
                                onClick={handleSubmitOrder}
                                disabled={basket.length === 0 || isSubmitting}
                                className="w-full py-5 bg-[#F59E0B] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-2xl shadow-amber-500/30 flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100 disabled:bg-slate-200 disabled:shadow-none"
                            >
                                {isSubmitting ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        Submit Purchase Order <Send className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
