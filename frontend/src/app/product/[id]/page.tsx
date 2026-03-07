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
    CheckCircle, Package, ArrowLeft, Tag
} from 'lucide-react';
import { useCart } from '@/context/CartContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Stars({ count = 4, total = 5 }: { count?: number; total?: number }) {
    return (
        <div className="flex gap-0.5">
            {Array.from({ length: total }).map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < count ? 'text-[#4f46e5] fill-[#4f46e5]' : 'text-gray-200 fill-gray-100'}`} />
            ))}
        </div>
    );
}

// Placeholder images when product has no image
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
        setProduct(null);

        const loadProduct = async () => {
            try {
                const data = await productService.getById(id);
                if (data) {
                    setProduct(data);
                    const allProducts = await productService.getAll();
                    const related = allProducts
                        .filter((p: any) => p.id !== data.id && p.category === data.category && p.category_name === data.category_name)
                        .slice(0, 4);
                    setRelatedProducts(related);
                } else {
                    setProduct(null);
                }
            } catch {
                setProduct(null);
            } finally {
                setLoading(false);
            }
        };

        loadProduct();
    }, [id]);

    const images: string[] = (() => {
        if (!product) return PLACEHOLDER_IMGS;
        if (product.images?.length) return product.images;
        if (product.image) return [product.image, ...PLACEHOLDER_IMGS.slice(1)];
        return PLACEHOLDER_IMGS;
    })();

    const price = parseFloat(product?.price || '0') || 0;
    const originalPrice = Math.round(price * 1.25);
    const discountPct = originalPrice > 0 ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

    const inStock = product?.stock === undefined || product?.stock > 0;

    const handleAddToCart = () => {
        if (!product || !inStock) return;
        addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity,
            image: images[0],
            category: product.category_name || 'Cosmetics',
        });
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2500);
    };

    // ── Loading Skeleton ──────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex flex-col min-h-screen bg-white transition-colors duration-300">
                <Navbar />
                <div className="container mx-auto px-4 lg:px-12 py-12 animate-pulse">
                    <div className="flex flex-col lg:flex-row gap-12">
                        <div className="flex gap-4">
                            <div className="flex flex-col gap-2">
                                {[1, 2, 3, 4].map(i => <div key={i} className="w-16 h-16 bg-gray-50 rounded-2xl" />)}
                            </div>
                            <div className="w-80 h-80 bg-gray-50 rounded-[2.5rem]" />
                        </div>
                        <div className="flex-1 space-y-6 py-4">
                            <div className="h-4 bg-gray-50 w-24 rounded-full" />
                            <div className="h-10 bg-gray-50 w-3/4 rounded-2xl" />
                            <div className="h-6 bg-gray-50 w-1/4 rounded-full" />
                            <div className="h-24 bg-gray-50 w-full rounded-2xl" />
                        </div>
                        <div className="w-80 h-96 bg-gray-50 rounded-[2rem]" />
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    // ── Product Not Found ─────────────────────────────────────────────────────
    if (!product) {
        return (
            <div className="flex flex-col min-h-screen bg-white transition-colors duration-300">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center gap-8 py-32 px-4">
                    <div className="w-24 h-24 bg-gray-50 shadow-xl rounded-[2rem] flex items-center justify-center text-gray-300 border border-gray-100 transition-colors">
                        <Package className="h-12 w-12" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Product Not Found</h1>
                        <p className="text-gray-500 font-medium max-w-sm leading-relaxed">
                            The item you&apos;re looking for might have been sold out or the page has moved.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button onClick={() => router.back()}
                            className="flex items-center justify-center gap-3 px-10 py-4 border border-gray-200 rounded-2xl text-sm font-black uppercase tracking-widest text-gray-700 hover:bg-gray-50 transition shadow-sm">
                            <ArrowLeft className="h-4 w-4" /> Go Back
                        </button>
                        <Link href="/shop"
                            className="px-10 py-4 bg-[#4f46e5] hover:bg-[#005f6e] text-white rounded-2xl text-sm font-black uppercase tracking-widest transition shadow-2xl shadow-indigo-900/20 text-center">
                            Browse Collection
                        </Link>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    // ── Full Product Page ─────────────────────────────────────────────────────
    return (
        <div className="flex flex-col min-h-screen bg-white font-sans transition-colors duration-300">
            <Navbar />

            {/* Breadcrumb */}
            <div className="bg-gray-50 border-b border-gray-100 transition-colors">
                <div className="container mx-auto px-4 lg:px-12 py-4 flex items-center gap-2 flex-wrap text-[10px] font-black uppercase tracking-[0.1em] text-gray-400">
                    <Link href="/" className="hover:text-[#4f46e5] transition-colors">Home</Link>
                    <ChevronRight className="h-3 w-3 text-gray-300" />
                    <Link href="/shop" className="hover:text-[#4f46e5] transition-colors">Shop</Link>
                    {product.category_name && (
                        <>
                            <ChevronRight className="h-3 w-3 text-gray-300" />
                            <Link href={`/shop?cat=${product.category_name.toLowerCase()}`}
                                className="hover:text-[#4f46e5] transition-colors">
                                {product.category_name}
                            </Link>
                        </>
                    )}
                    <ChevronRight className="h-3 w-3 text-gray-300" />
                    <span className="text-[#4f46e5] truncate max-w-xs">{product.name}</span>
                </div>
            </div>

            <main className="flex-1 py-12">
                <div className="container mx-auto px-4 lg:px-12">

                    <div className="flex flex-col lg:flex-row gap-16">
                        {/* Left: Image Gallery */}
                        <div className="flex flex-col sm:flex-row gap-6 lg:w-[480px]">
                            {/* Thumbnails */}
                            <div className="flex sm:flex-col gap-3 order-2 sm:order-1">
                                {images.map((img, idx) => (
                                    <button key={idx} onClick={() => setActiveImage(idx)}
                                        className={`w-16 h-16 rounded-2xl overflow-hidden transition-all duration-300 border-2 shadow-sm ${activeImage === idx ? 'border-[#4f46e5] scale-105 shadow-[#4f46e5]/20' : 'border-gray-50 hover:border-gray-200'}`}>
                                        <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                            {/* Main image */}
                            <div className="flex-1 aspect-square rounded-[3rem] overflow-hidden border border-gray-100 bg-gray-50 shadow-2xl shadow-gray-200/50 order-1 sm:order-2 group transition-colors">
                                <img src={images[activeImage]} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            </div>
                        </div>

                        {/* Center: Info */}
                        <div className="flex-1 min-w-0 py-2">
                            {/* Category tag */}
                            {product.category_name && (
                                <span className="inline-flex items-center gap-2 text-[10px] font-black text-[#4f46e5] bg-[#4f46e5]/5 px-3 py-1.5 rounded-full mb-6 uppercase tracking-[0.2em] shadow-sm transition-colors">
                                    <Tag className="h-3 w-3" /> {product.category_name}
                                </span>
                            )}

                            <h1 className="text-3xl lg:text-4xl font-black text-gray-900 leading-tight mb-3 tracking-tight transition-colors">{product.name}</h1>
                            {product.brand && (
                                <p className="text-sm font-bold text-[#4f46e5] mb-6 uppercase tracking-wider">
                                    Collection: <span className="text-gray-900">{product.brand}</span>
                                </p>
                            )}

                            {/* Ratings */}
                            <div className="flex items-center gap-4 mb-4">
                                <Stars count={4} />
                                <span className="text-xs font-black text-[#4f46e5] hover:underline cursor-pointer uppercase tracking-widest transition-colors">120 Verified Reviews</span>
                            </div>

                            <div className="mb-8">
                                <div className="flex items-center gap-4">
                                    <span className="text-4xl font-black text-[#4f46e5] tracking-tighter transition-colors">Rs. {price.toLocaleString()}</span>
                                    {discountPct > 0 && (
                                        <div className="flex flex-col">
                                            <span className="text-sm text-gray-400 line-through font-bold leading-none">Rs. {originalPrice.toLocaleString()}</span>
                                            <span className="text-[10px] text-indigo- font-black uppercase tracking-widest mt-1">-{discountPct}% EXCLUSIVE DEAL</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-3 transition-colors">All prices include service taxes</p>
                            </div>

                            <div className="mb-8 border-y border-gray-100 py-8 transition-colors">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Product Details</h3>
                                <p className="text-base text-gray-600 leading-relaxed font-medium mb-6 transition-colors">
                                    {product.description || 'Premium quality beauty product formulated with the finest ingredients. Delivers outstanding results with every use. Suitable for all skin types.'}
                                </p>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[
                                        'Dermatologist tested & approved',
                                        'Cruelty-free & vegan formula',
                                        'Hypoallergenic & safe for skin',
                                        'Exclusive boutique collection',
                                    ].map(f => (
                                        <li key={f} className="flex items-center gap-3 text-sm font-bold text-gray-700 transition-colors">
                                            <div className="w-5 h-5 bg-[#4f46e5]/10 rounded-full flex items-center justify-center flex-shrink-0">
                                                <CheckCircle className="h-3 w-3 text-[#4f46e5]" />
                                            </div>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shadow-inner transition-colors">
                                        <ShieldCheck className="h-5 w-5 text-[#4f46e5]" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1 transition-colors">Authenticity Guaranteed</p>
                                        <p className="text-xs font-bold text-gray-900 transition-colors">100% Original Products</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shadow-inner transition-colors">
                                        <Truck className="h-5 w-5 text-[#4f46e5]" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1 transition-colors">Fast Shipping</p>
                                        <p className="text-xs font-bold text-gray-900 transition-colors">Ships in 24-48 Hours</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Buy Box */}
                        <div className="w-full lg:w-80 flex-shrink-0">
                            <div className="bg-gray-50 border border-gray-100 rounded-[2.5rem] p-8 space-y-8 sticky top-32 shadow-2xl shadow-gray-200/50 transition-colors">
                                <div>
                                    <p className="text-xs font-black text-[#4f46e5] uppercase tracking-[0.2em] mb-2 transition-colors">Standard Pricing</p>
                                    <p className="text-4xl font-black text-gray-900 tracking-tighter transition-colors">Rs. {price.toLocaleString()}</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm font-bold text-indigo- transition-colors">
                                        <Truck className="h-5 w-5" /> Express Delivery Available
                                    </div>
                                    <p className={`font-bold text-sm flex items-center gap-2 transition-colors ${inStock ? 'text-indigo-' : 'text-red-500'}`}>
                                        {inStock ? <><div className="w-2 h-2 rounded-full bg-indigo- animate-pulse" /> Product In Stock</> : '✗ Currently Unavailable'}
                                    </p>
                                </div>

                                {/* Quantity */}
                                {inStock && (
                                    <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-inner border border-gray-100 transition-colors">
                                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2 transition-colors">Quantity</span>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-50 transition text-gray-900">
                                                <Minus className="h-3 w-3" />
                                            </button>
                                            <span className="w-8 text-center text-sm font-black text-gray-900">{quantity}</span>
                                            <button onClick={() => setQuantity(quantity + 1)}
                                                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-50 transition text-gray-900">
                                                <Plus className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <button onClick={handleAddToCart} disabled={!inStock}
                                        className={`w-full py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg ${!inStock
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            : addedToCart
                                                ? 'bg-indigo-50 border border-indigo-200 text-indigo-'
                                                : 'bg-[#4f46e5] hover:bg-[#4338ca] text-white shadow-indigo-900/20 active:scale-[0.98]'}`}>
                                        {!inStock ? 'Sold Out' : addedToCart ? 'Added to Bag!' : 'Add to Shopping Bag'}
                                    </button>

                                    <button onClick={() => { handleAddToCart(); router.push('/checkout'); }} disabled={!inStock}
                                        className={`w-full py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${!inStock
                                            ? 'bg-gray-50 border border-gray-100 text-gray-300 cursor-not-allowed'
                                            : 'bg-white border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'}`}>
                                        Immediate Purchase
                                    </button>
                                </div>

                                <div className="flex justify-between items-center px-2">
                                    <button onClick={() => setWishlist(!wishlist)}
                                        className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${wishlist ? 'text-red-500' : 'text-gray-400 hover:text-gray-900'}`}>
                                        <Heart className={`h-4 w-4 ${wishlist ? 'fill-red-500' : ''}`} />
                                        {wishlist ? 'Saved' : 'Save'}
                                    </button>
                                    <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">
                                        <Share2 className="h-4 w-4" /> Share
                                    </button>
                                </div>

                                <div className="pt-4 border-t border-gray-100 space-y-4 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck className="h-4 w-4 text-[#4f46e5]" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest transition-colors">Al-Qavi Safe Payments</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <RotateCcw className="h-4 w-4 text-[#4f46e5]" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest transition-colors">7-Day Premium Returns</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Related Products ── */}
                    {relatedProducts.length > 0 && (
                        <div className="mt-24">
                            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-12 text-center">
                                Complementary Products
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-12">
                                {relatedProducts.map(p => {
                                    const rPrice = parseFloat(p.price || '0') || 0;
                                    return (
                                        <Link key={p.id} href={`/product/${p.id}`} className="group block">
                                            <div className="aspect-square overflow-hidden mb-6 bg-gray-50 rounded-[2rem] border border-gray-100 shadow-sm group-hover:shadow-2xl transition-all duration-500">
                                                <img
                                                    src={p.image || PLACEHOLDER_IMGS[0]}
                                                    alt={p.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-[#4f46e5] uppercase tracking-widest mb-1.5 transition-colors">{p.category_name}</p>
                                                <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#4f46e5] transition-colors line-clamp-1 mb-2 tracking-tight">{p.name}</h3>
                                                <p className="font-black text-gray-900 tracking-tighter transition-colors">Rs. {rPrice.toLocaleString()}</p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Back to shop */}
                    <div className="mt-20 flex justify-center border-t border-gray-50 pt-12">
                        <button onClick={() => router.back()}
                            className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-[#4f46e5] transition-colors">
                            <ArrowLeft className="h-4 w-4" /> Return to Results
                        </button>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
}
