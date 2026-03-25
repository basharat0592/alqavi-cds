'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { productService } from '@/lib/api';
import {
    Star, ShoppingCart, Truck, RotateCcw,
    Minus, Plus, ChevronRight, AlertCircle, Heart, Share2,
    CheckCircle, Package, ArrowLeft, Tag, Eye, Info, Zap, ArrowRight,
    Lock, MapPin, Sparkles, ShieldCheck, Globe
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { getImageUrl } from '@/lib/utils';

function PremiumStars({ count = 4, reviews = 128 }: { count?: number; reviews?: number }) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < count ? 'text-accent fill-accent' : 'text-slate-200'}`} />
                ))}
            </div>
            <span className="text-sm font-semibold text-slate-400">{reviews} Verified Reviews</span>
        </div>
    );
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { addToCart } = useCart();
    const router = useRouter();

    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [activeImage, setActiveImage] = useState(0);
    const [relatedProducts, setRelatedProducts] = useState<any[]>([]);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        const load = async () => {
            try {
                const data = await productService.getById(id);
                if (data) {
                    setProduct(data);
                    const allProducts = await productService.getAll();
                    const apiArr = Array.isArray(allProducts) ? allProducts : (allProducts as any).results || [];
                    const related = apiArr
                        .filter((p: any) => p.id !== data.id && p.status === 'active')
                        .slice(0, 4);
                    setRelatedProducts(related);
                }
            } catch (err) { } finally { setLoading(false); }
        };
        load();
    }, [id]);

    if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="p-40 text-center"><div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full mx-auto" /></div></div>;
    if (!product) return <div className="min-h-screen bg-background"><Navbar /><div className="p-40 text-center text-slate-500">Product not found.</div><Footer /></div>;

    const price = parseFloat(product.price || '0');
    const inStock = product.stock === undefined || product.stock > 0;
    const images = [getImageUrl(product.image_url || product.image)].filter(Boolean) as string[];
    if (images.length === 0) images.push('https://images.unsplash.com/photo-1596462502278-27bfdd403cc2?w=800');

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Navbar />

            <main className="flex-1 pt-24 pb-24 container mx-auto px-6">
                
                {/* ── BREADCRUMBS ── */}
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-10">
                    <Link href="/shop" className="hover:text-accent transition-colors">Shop</Link>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-slate-900 dark:text-white truncate max-w-[250px]">{product.name}</span>
                </div>

                <div className="flex flex-col lg:flex-row gap-16">
                    
                    {/* ── LEFT: VISUALS ── */}
                    <div className="w-full lg:w-1/2 space-y-6">
                        <div className="relative group bg-white dark:bg-slate-900 rounded-2xl border border-border overflow-hidden aspect-square flex items-center justify-center p-8">
                            <img src={images[activeImage]} className="max-w-full max-h-full object-contain transition-transform duration-700 group-hover:scale-105" alt={product.name} />
                        </div>

                        {/* Gallery Thumbnails */}
                        {images.length > 1 && (
                            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                                {images.map((img, i) => (
                                    <button key={i} onClick={() => setActiveImage(i)}
                                        className={`w-20 aspect-square rounded-xl overflow-hidden border-2 transition-all ${activeImage === i ? 'border-accent shadow-lg' : 'border-border hover:border-accent/40'}`}>
                                        <img src={img} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-4 py-4 border-t border-border">
                            {[
                                { icon: <Globe className="h-5 w-5" />, label: "Direct Import" },
                                { icon: <ShieldCheck className="h-5 w-5" />, label: "Authentic" },
                                { icon: <Package className="h-5 w-5" />, label: "Safe Shipping" },
                            ].map((m, i) => (
                                <div key={i} className="flex flex-col items-center gap-2 text-center py-4">
                                    <div className="text-accent">{m.icon}</div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{m.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── RIGHT: INFORMATION ── */}
                    <div className="flex-1 space-y-8">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-widest text-accent px-3 py-1 bg-accent/10 rounded-lg">{product.category_name || 'Beauty Product'}</span>
                                <div className="flex gap-2">
                                    <button className="p-2.5 rounded-xl border border-border hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-400 hover:text-red-500"><Heart className="h-5 w-5" /></button>
                                    <button className="p-2.5 rounded-xl border border-border hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-400 hover:text-accent"><Share2 className="h-5 w-5" /></button>
                                </div>
                            </div>
                            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight dark:text-white leading-tight">{product.name}</h1>
                            <PremiumStars count={4} />
                        </div>

                        <div className="space-y-4 pt-4">
                            <div className="flex items-baseline gap-4">
                                <span className="text-2xl font-bold tracking-tight dark:text-white">PKR {price.toLocaleString()}</span>
                                <span className="text-slate-400 text-sm font-medium line-through">PKR {(price * 1.15).toLocaleString()}</span>
                            </div>
                            
                            <div className="bg-slate-50 dark:bg-slate-900 border-l-4 border-accent p-6 rounded-r-2xl space-y-2">
                                <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                                    <Zap className="h-4 w-4 text-accent fill-accent" />
                                    Fast Fulfillment Guaranteed
                                </div>
                                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                    Direct wholesale delivery within 48-72 hours across major cities. 100% genuine product guarantee from Al-Qavi Distributor.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6 pt-4">
                            <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-border">
                                <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-1 rounded-xl border border-border shadow-sm">
                                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center dark:text-white"><Minus className="h-4 w-4" /></button>
                                    <span className="w-8 text-center font-bold dark:text-white">{quantity}</span>
                                    <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center dark:text-white"><Plus className="h-4 w-4" /></button>
                                </div>
                                <div className="text-right pr-4">
                                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Total Price</p>
                                    <p className="text-xl font-bold dark:text-white">PKR {(price * quantity).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button onClick={() => addToCart({ ...product, quantity, image: product.image_url || product.image })} disabled={!inStock}
                                    className="flex-1 py-3 bg-accent text-white rounded-lg font-bold flex items-center justify-center gap-3 shadow-lg shadow-accent/20 hover:bg-hover transition-all active:scale-[0.98]">
                                    <ShoppingCart className="h-5 w-5" /> Add to Cart
                                </button>
                                <button onClick={() => { addToCart({ ...product, quantity, image: product.image_url || product.image }); router.push('/checkout'); }} disabled={!inStock}
                                    className="flex-1 py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-lg font-bold flex items-center justify-center gap-3 shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98]">
                                    <Zap className="h-5 w-5" /> Buy Now
                                </button>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-border space-y-6">
                            <div className="prose dark:prose-invert prose-sm max-w-none">
                                <h3 className="text-lg font-bold">Product Information</h3>
                                <p className="text-slate-500 leading-relaxed font-medium">
                                    {product.description || "Detailed description for this product is currently being updated by our registry team."}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-8 text-sm pt-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Brand</p>
                                    <p className="font-bold dark:text-white capitalize">{product.brand_name || 'Premium Hub'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">SKU Status</p>
                                    <p className="font-bold dark:text-white">{inStock ? 'Available in Stock' : 'Out of Stock'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── RELATED PRODUCTS ── */}
                {relatedProducts.length > 0 && (
                    <div className="mt-24 pt-20 border-t border-border">
                        <div className="flex items-center justify-between mb-10">
                            <h2 className="text-3xl font-bold tracking-tight dark:text-white">You May Also Like</h2>
                            <Link href="/shop" className="text-sm font-bold text-accent hover:underline flex items-center gap-2">View All <ArrowRight className="h-4 w-4" /></Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            {relatedProducts.map(p => (
                                <Link key={p.id} href={`/product/${p.id}`} className="group bg-white dark:bg-slate-900 rounded-2xl border border-border overflow-hidden hover:shadow-xl transition-all duration-300">
                                    <div className="relative aspect-square bg-slate-50 overflow-hidden">
                                        <img src={getImageUrl(p.image_url || p.image) || images[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-xs dark:text-white line-clamp-1 mb-1.5 group-hover:text-accent transition-colors">{p.name}</h3>
                                        <div className="text-sm font-bold dark:text-white">PKR {parseFloat(p.price).toLocaleString()}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
