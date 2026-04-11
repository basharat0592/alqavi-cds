'use client';

import PageLoader from '@/components/ui/PageLoader';

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

    if (loading) return <PageLoader />;
    if (!product) return <div className="min-h-screen bg-background"><Navbar /><div className="p-40 text-center text-slate-500">Product not found.</div><Footer /></div>;

    const price = parseFloat(product.price || '0');
    const inStock = product.stock === undefined || product.stock > 0;
    const images = [getImageUrl(product.image_url || product.image)].filter(Boolean) as string[];
    if (images.length === 0) images.push('https://images.unsplash.com/photo-1596462502278-27bfdd403cc2?w=800');

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <Navbar />

            <main className="flex-1 pb-24 container mx-auto px-4 lg:px-8">

                {/* ── BREADCRUMBS ── */}
                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 py-4 hover:underline">
                    <Link href="/shop" className="hover:text-[#C7511F]">Shop</Link>
                    <ChevronRight className="h-3 w-3 mt-0.5" />
                    <span className="truncate max-w-[250px]">{product.name}</span>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 mt-4">

                    {/* ── COLUMN 1: IMAGES (FIXED ON DESKTOP) ── */}
                    <div className="w-full lg:w-[450px] space-y-4">
                        <div className="relative bg-white border border-slate-100 rounded-sm overflow-hidden aspect-square flex items-center justify-center p-4">
                            <img src={images[activeImage]} className="max-w-full max-h-full object-contain" alt={product.name} />
                        </div>

                        {/* Gallery Thumbnails */}
                        {images.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                {images.map((img, i) => (
                                    <button key={i} onClick={() => setActiveImage(i)}
                                        className={`w-14 h-14 rounded-sm overflow-hidden border-2 transition-all ${activeImage === i ? 'border-[#C7511F]' : 'border-slate-100 hover:border-slate-300'}`}>
                                        <img src={img} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── COLUMN 2: CENTER INFO ── */}
                    <div className="flex-1 space-y-6">
                        <div className="pb-4 border-b border-slate-200">
                            <h1 className="text-xl lg:text-2xl font-bold text-[#1d252c] leading-tight mb-2">{product.name}</h1>
                            <div className="flex items-center gap-4">
                                <Link href="#" className="text-[14px] font-medium text-[#007185] hover:text-[#C7511F] hover:underline">Visit the Hub Store</Link>
                                <div className="h-4 w-[1px] bg-slate-200" />
                                <PremiumStars count={4} reviews={product.reviews_count || 128} />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-sm font-medium text-red-700">-15%</span>
                                <div className="flex items-start">
                                    <span className="text-sm font-medium mt-1">Rs.</span>
                                    <span className="text-3xl font-medium tracking-tighter">{Math.floor(price).toLocaleString()}</span>
                                    <span className="text-sm font-medium mt-1">00</span>
                                </div>
                            </div>
                            <div className="text-[13px] text-slate-500">List Price: <span className="line-through">Rs.{(price * 1.15).toLocaleString()}</span></div>
                        </div>

                        <div className="pt-4 space-y-4">
                            <div className="grid grid-cols-1 gap-2 text-[14px]">
                                {[
                                    { k: "Brand", v: product.brand_name || 'Al-Qavi Premium' },
                                    { k: "Item Form", v: "Premium Formulation" },
                                    { k: "Active Ingredients", v: "Authentic Clinical Blend" },
                                    { k: "Skin Type", v: "All, Sensitive" }
                                ].map((row, i) => (
                                    <div key={i} className="flex">
                                        <span className="w-32 font-bold text-[#1d252c]">{row.k}</span>
                                        <span className="flex-1 text-slate-700">{row.v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-6">
                            <h3 className="text-[15px] font-bold mb-2">About this item</h3>
                            <ul className="list-disc pl-5 space-y-2 text-[14px] text-slate-700 leading-relaxed font-medium">
                                <li>100% Authentic imported clinical-grade skincare formulation.</li>
                                <li>Dermatologically tested for high performance and safety.</li>
                                <li>Direct wholesale procurement ensures the freshest batch available.</li>
                                <li>Strict quality audit with 100% money-back guarantee.</li>
                                <li>{product.description || "Premium beauty solution for professional distribution."}</li>
                            </ul>
                        </div>
                    </div>

                    {/* ── COLUMN 3: BUY BOX (FIXED ON DESKTOP RIGHT) ── */}
                    <div className="w-full lg:w-[280px]">
                        <div className="border border-slate-300 rounded-lg p-6 space-y-4 shadow-sm sticky top-28">
                            <div className="flex items-start">
                                <span className="text-sm font-medium mt-1">Rs.</span>
                                <span className="text-2xl font-medium tracking-tighter">{price.toLocaleString()}</span>
                            </div>
                            
                            <div className="space-y-1">
                                <p className="text-[13px] text-slate-700">Delivery <span className="font-bold">Tomorrow, Sept 28</span></p>
                                <p className="text-[13px] text-slate-500">Or fastest delivery <span className="font-bold text-[#1d252c]">Today</span>. Order within <span className="text-emerald-700 font-bold">4 hrs 22 mins</span></p>
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-sm text-[#007185] hover:text-[#C7511F] cursor-pointer">
                                    <MapPin className="h-4 w-4" /> Deliver to Karachi
                                </div>
                                <div className={`text-lg font-bold ${inStock ? 'text-emerald-700' : 'text-red-600'}`}>
                                    {inStock ? 'In Stock' : 'Out of Stock'}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <select 
                                        value={quantity}
                                        onChange={(e) => setQuantity(parseInt(e.target.value))}
                                        className="w-full bg-[#F0F2F2] border border-[#D5D9D9] hover:bg-[#E3E6E6] rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm outline-none cursor-pointer"
                                    >
                                        {[1,2,3,4,5,10,20].map(n => <option key={n} value={n}>Qty: {n}</option>)}
                                    </select>
                                    
                                    <button onClick={() => addToCart({ ...product, quantity, image: product.image_url || product.image })} disabled={!inStock}
                                        className="w-full py-2 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] rounded-full text-xs font-bold shadow-sm transition-colors text-black">
                                        Add to Cart
                                    </button>
                                    
                                    <button onClick={() => { addToCart({ ...product, quantity, image: product.image_url || product.image }); router.push('/checkout'); }} disabled={!inStock}
                                        className="w-full py-2 bg-[#FFA41C] hover:bg-[#F3A847] border border-[#FF8F00] rounded-full text-xs font-bold shadow-sm transition-colors text-black">
                                        Buy Now
                                    </button>
                                </div>

                                <div className="space-y-2 pt-2 text-[12px] text-slate-700">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Ships from</span>
                                        <span>Al-Qavi Hub</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Sold by</span>
                                        <span className="text-[#007185] hover:text-[#C7511F] hover:underline cursor-pointer">Al-Qavi Store</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Returns</span>
                                        <span className="text-[#007185] hover:text-[#C7511F] hover:underline cursor-pointer">Eligible for Return</span>
                                    </div>
                                </div>
                            </div>
                            
                            <button className="w-full py-1.5 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-bold transition-colors">
                                Add to Wish List
                            </button>
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
