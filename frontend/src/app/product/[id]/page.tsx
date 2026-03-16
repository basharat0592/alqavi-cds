'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { productService } from '@/lib/api';
import {
    Star, ShoppingCart, Truck, ShieldCheck, RotateCcw,
    Minus, Plus, ChevronRight, AlertCircle, Heart, Share2,
    CheckCircle, Package, ArrowLeft, Tag, Eye, Info, Zap, ArrowRight
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { getImageUrl } from '@/lib/utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Stars({ count = 4, total = 5 }: { count?: number; total?: number }) {
    return (
        <div className="flex gap-0.5">
            {Array.from({ length: total }).map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < count ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-slate-700 fill-gray-100 dark:fill-slate-800'}`} />
            ))}
        </div>
    );
}

const PLACEHOLDER_IMGS = [
    'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=80',
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { addToCart } = useCart();
    const router = useRouter();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [activeImage, setActiveImage] = useState(0);
    const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
    const [addedToCart, setAddedToCart] = useState(false);
    const [wishlist, setWishlist] = useState(false);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        const load = async () => {
            try {
                const data = await productService.getById(id);
                if (data) {
                    setProduct(data);
                    const allProducts = await productService.getAll();
                    const related = allProducts
                        .filter((p: any) => p.id !== data.id && (p.category_name === data.category_name || p.category === data.category))
                        .slice(0, 4);
                    setRelatedProducts(related);
                }
            } catch (err) { } finally { setLoading(false); }
        };
        load();
    }, [id]);

    const images: string[] = (() => {
        if (!product) return PLACEHOLDER_IMGS;
        if (product.images?.length) return product.images.map((img: string) => getImageUrl(img) || img);
        const mainImg = getImageUrl(product.image_url || product.image);
        if (mainImg) return [mainImg, ...PLACEHOLDER_IMGS.slice(1)];
        return PLACEHOLDER_IMGS;
    })();

    const price = parseFloat(product?.price || '0') || 0;
    const originalPrice = Math.round(price * 1.25);
    const discountPct = Math.round(((originalPrice - price) / originalPrice) * 100);
    const inStock = product?.stock === undefined || product?.stock > 0;

    const handleAddToCart = () => {
        if (!product || !inStock) return;
        addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: quantity,
            image: product.image_url || product.image || '',
            category: product.category_name || 'Beauty'
        });
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2500);
    };

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen bg-white dark:bg-[#0f172a]">
                <Navbar />
                <div className="container mx-auto px-4 lg:px-12 py-20 animate-pulse">
                    <div className="flex flex-col lg:flex-row gap-16">
                        <div className="lg:w-[500px] aspect-square bg-gray-100 dark:bg-slate-800 rounded-[3rem]" />
                        <div className="flex-1 space-y-6">
                            <div className="h-6 bg-gray-100 dark:bg-slate-800 w-24 rounded-full" />
                            <div className="h-12 bg-gray-100 dark:bg-slate-800 w-3/4 rounded-2xl" />
                            <div className="h-4 bg-gray-100 dark:bg-slate-800 w-1/4 rounded-full" />
                            <div className="space-y-4">
                                <div className="h-24 bg-gray-100 dark:bg-slate-800 rounded-2xl" />
                                <div className="h-12 bg-gray-100 dark:bg-slate-800 w-1/2 rounded-xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="flex flex-col min-h-screen bg-white dark:bg-[#0f172a]">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center py-32 px-4">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-gray-400 mb-8">
                        <AlertCircle className="h-12 w-12" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Item Not Found</h1>
                    <p className="text-gray-500 mb-8">The product may have been removed or the URL is incorrect.</p>
                    <Link href="/shop" className="px-10 py-4 bg-[#FF9900] text-white font-black rounded-xl shadow-xl shadow-[#FF9900]/20 active:scale-95 transition-all">
                        Discover Other Products
                    </Link>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#F8F9FA] dark:bg-[#0f172a] font-sans selection:bg-[#FF9900]/30 transition-colors duration-500">
            <Navbar />

            <main className="flex-1 py-12">
                <div className="container mx-auto px-4 lg:px-12">
                    
                    {/* Back Link */}
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-[#FF9900] mb-8 transition-colors">
                        <ArrowLeft className="h-4 w-4" /> Back to Collection
                    </button>

                    <div className="flex flex-col lg:flex-row gap-16">
                        {/* LEFT: MEDIA */}
                        <div className="lg:w-[500px] flex flex-col gap-6">
                            <div className="aspect-square bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden border border-gray-100 dark:border-slate-800 shadow-2xl shadow-gray-200/50 dark:shadow-none relative group">
                                <img src={images[activeImage]} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                {discountPct > 0 && (
                                    <div className="absolute top-6 left-6 bg-[#FF9900] text-white text-[10px] font-black px-4 py-2 rounded-full shadow-lg">
                                        SAVE {discountPct}%
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-4 px-2 overflow-x-auto pb-2 scrollbar-none">
                                {images.map((img, i) => (
                                    <button key={i} onClick={() => setActiveImage(i)}
                                        className={`w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${activeImage === i ? 'border-[#FF9900] scale-105 shadow-lg shadow-[#FF9900]/10' : 'border-white dark:border-slate-800 opacity-60 hover:opacity-100'}`}>
                                        <img src={img} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* CENTER: INFO */}
                        <div className="flex-1 py-2">
                            <div className="flex items-center gap-2 mb-6">
                                {product.category_name && (
                                    <span className="bg-[#FF9900]/10 text-[#FF9900] text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
                                        {product.category_name}
                                    </span>
                                )}
                                <span className="text-gray-300 dark:text-slate-700">|</span>
                                <div className="flex items-center gap-4">
                                    <Stars count={4} />
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">120+ Recommendations</span>
                                </div>
                            </div>

                            <h1 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-6 leading-[1.1] tracking-tighter">
                                {product.name}
                            </h1>

                            <div className="flex items-center gap-4 mb-8">
                                <span className="text-4xl font-black text-[#FF9900]">Rs. {price.toLocaleString()}</span>
                                {discountPct > 0 && (
                                    <span className="text-lg text-gray-400 dark:text-slate-500 line-through font-bold decoration-red-500/30">
                                        Rs. {originalPrice.toLocaleString()}
                                    </span>
                                )}
                            </div>

                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-8 mb-10 shadow-sm">
                                <h3 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <Info className="h-4 w-4" /> Description & Key Benefits
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed font-medium mb-8">
                                    {product.description || 'This premium collection essential is crafted for results. Experience the luxury of Al-Qavi quality, delivering unmatched performance for professionals and beauty enthusiasts alike.'}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[
                                        'Official Boutique Selection',
                                        '100% Authentic Guaranteed',
                                        'Premium Luxury Ingredients',
                                        'Safe for All Environments'
                                    ].map(item => (
                                        <div key={item} className="flex items-center gap-3 text-xs font-bold text-gray-800 dark:text-gray-200">
                                            <div className="w-5 h-5 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                <CheckCircle className="h-3 w-3" />
                                            </div>
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-8 items-center border-t border-gray-100 dark:border-slate-800 pt-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-[#FF9900] shadow-sm border border-gray-100 dark:border-slate-700">
                                        <ShieldCheck className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Protection</p>
                                        <p className="text-xs font-black text-gray-900 dark:text-white uppercase leading-none">Safe Goods</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-[#FF9900] shadow-sm border border-gray-100 dark:border-slate-700">
                                        <Truck className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Logistics</p>
                                        <p className="text-xs font-black text-gray-900 dark:text-white uppercase leading-none">Fast Transit</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: BUY BOX */}
                        <div className="lg:w-80 flex-shrink-0">
                            <div className="bg-[#131921] text-white rounded-[2.5rem] p-8 sticky top-28 shadow-2xl shadow-indigo-950/20 overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF9900]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                                
                                <div className="relative mb-8">
                                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2">Buy For Only</p>
                                    <p className="text-4xl font-black text-[#FF9900] tracking-tighter leading-none">Rs. {price.toLocaleString()}</p>
                                    <p className={`mt-4 text-[11px] font-bold flex items-center gap-2 ${inStock ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {inStock ? <><Zap className="h-3 w-3 fill-emerald-400" /> IN STOCK — READY TO SHIP</> : 'OUT OF STOCK'}
                                    </p>
                                </div>

                                {inStock && (
                                    <div className="relative flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-2xl mb-6">
                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Qty</span>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition"><Minus className="h-3 w-3" /></button>
                                            <span className="w-8 text-center text-sm font-black">{quantity}</span>
                                            <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition"><Plus className="h-3 w-3" /></button>
                                        </div>
                                    </div>
                                )}

                                <div className="relative space-y-3">
                                    <button onClick={handleAddToCart} disabled={!inStock}
                                        className={`w-full py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] shadow-xl ${addedToCart ? 'bg-emerald-500 text-white' : 'bg-[#FF9900] hover:bg-white hover:text-[#FF9900] text-[#131921] shadow-[#FF9900]/20'}`}>
                                        {addedToCart ? <span className="flex items-center justify-center gap-2"><CheckCircle className="h-4 w-4" /> Added To Bag</span> : 'Add to Shopping Bag'}
                                    </button>
                                    <button onClick={() => { handleAddToCart(); router.push('/checkout'); }} disabled={!inStock}
                                        className="w-full py-5 rounded-2xl text-xs font-black uppercase tracking-widest bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all">
                                        Immediate Purchase
                                    </button>
                                </div>

                                <div className="relative mt-8 flex justify-between px-2 pt-6 border-t border-white/10">
                                    <button onClick={() => setWishlist(!wishlist)} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${wishlist ? 'text-red-400' : 'text-white/40 hover:text-white'}`}>
                                        <Heart className={`h-4 w-4 ${wishlist ? 'fill-red-400' : ''}`} /> {wishlist ? 'Saved' : 'Wishlist'}
                                    </button>
                                    <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">
                                        <Share2 className="h-4 w-4" /> Share
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RELATED */}
                    {relatedProducts.length > 0 && (
                        <div className="mt-32">
                            <SectionHeader eyebrow="More To Love" title="You Might Also Need" cta="See More" href="/shop" />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12">
                                {relatedProducts.map(p => (
                                    <Link key={p.id} href={`/product/${p.id}`} className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-4 border border-gray-100 dark:border-slate-800 hover:shadow-2xl transition-all duration-500">
                                        <div className="aspect-square rounded-[1.5rem] overflow-hidden bg-gray-50 dark:bg-slate-800 mb-6">
                                            <img src={p.image || PLACEHOLDER_IMGS[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        </div>
                                        <div className="px-2 pb-2">
                                            <p className="text-[9px] text-[#FF9900] font-black uppercase tracking-widest mb-2">{p.category_name}</p>
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#FF9900] transition-colors mb-2 line-clamp-1">{p.name}</h3>
                                            <p className="font-black text-gray-900 dark:text-[#FF9900]">Rs. {parseFloat(p.price).toLocaleString()}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </main>

            <Footer />
        </div>
    );
}

function SectionHeader({ eyebrow, title, cta, href }: { eyebrow: string; title: string; cta?: string; href?: string }) {
    return (
        <div className="flex items-end justify-between border-b border-gray-100 dark:border-slate-800 pb-8">
            <div>
                <p className="text-[11px] text-[#FF9900] font-black uppercase tracking-[0.3em] mb-2">{eyebrow}</p>
                <h2 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white tracking-tight">{title}</h2>
            </div>
            {cta && href && (
                <Link href={href} className="text-xs font-black text-[#FF9900] hover:underline uppercase tracking-widest flex items-center gap-2 group">
                    {cta} <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
            )}
        </div>
    );
}
