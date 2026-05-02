'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { productService } from '@/services/product.service';
import { getImageUrl } from '@/lib/utils';
import { ShoppingCart, Star, Truck, ShieldCheck, MapPin, Lock, ChevronRight, RotateCcw, Package, Minus, Plus, Zap } from 'lucide-react';
import Link from 'next/link';
import PageLoader from '@/components/ui/PageLoader';
import { useCart } from '@/context/CartContext';

const AmazonStars = ({ count, reviews }: { count: number, reviews: number }) => (
    <div className="flex items-center gap-1">
        <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
                <Star
                    key={i}
                    size={14}
                    className={i < count ? "fill-[#FFA41C] text-[#FFA41C]" : "text-[#E5E7EB] fill-[#E5E7EB]"}
                />
            ))}
        </div>
        <span className="text-[14px] text-[#007185] hover:text-[#C45500] hover:underline cursor-pointer ml-1">{reviews} ratings</span>
    </div>
);

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
                        .filter((p: any) => p.id !== data.id && p.status === 'ACTIVE')
                        .slice(0, 6);
                    setRelatedProducts(related);
                }
            } catch (err) { } finally { setLoading(false); }
        };
        load();
    }, [id]);

    if (loading) return <PageLoader />;
    if (!product) return <div className="min-h-screen bg-white"><Navbar /><div className="p-40 text-center text-slate-500 font-sans">Product not found.</div><Footer /></div>;

    const price = parseFloat(product.selling_price || product.price || '0');
    const retailPrice = product.cost_price ? parseFloat(product.cost_price) * 1.5 : price * 1.2;
    const discount = Math.round(((retailPrice - price) / retailPrice) * 100);
    const inStock = product.total_quantity > 0;

    const images = [
        getImageUrl(product.image || product.catalog_image),
        ...(product.additional_images?.map((img: any) => getImageUrl(img.image)) || [])
    ].filter(Boolean) as string[];

    if (images.length === 0) images.push('/images/logo.png');

    return (
        <div className="flex flex-col min-h-screen bg-white text-[#0f1111] font-sans">
            <Navbar />

            <main className="flex-1 pt-16 pb-20 max-w-[1500px] mx-auto px-4 lg:px-8">

                {/* ── BREADCRUMBS ── */}
                <div className="flex items-center gap-1 text-[12px] text-[#565959] mb-4">
                    <Link href="/customer" className="hover:text-[#c45500] hover:underline">Home</Link>
                    <ChevronRight size={12} />
                    <span className="hover:text-[#c45500] hover:underline cursor-pointer">{product.category_name}</span>
                    <ChevronRight size={12} />
                    <span className="text-[#565959] truncate max-w-[200px]">{product.product_name}</span>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 items-start">

                    {/* ── COL 1: GALLERY ── */}
                    <div className="w-full lg:w-[45%] flex flex-col-reverse lg:flex-row gap-4">
                        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto no-scrollbar lg:max-h-[500px]">
                            {images.map((img, i) => (
                                <button
                                    key={i}
                                    onMouseEnter={() => setActiveImage(i)}
                                    onClick={() => setActiveImage(i)}
                                    className={`w-[45px] lg:w-[50px] aspect-square rounded-[3px] border-2 transition-all p-1 bg-white shrink-0 ${activeImage === i ? 'border-[#e77600] shadow-[0_0_3px_2px_rgba(228,121,17,0.5)]' : 'border-[#ddd] hover:border-[#e77600]'}`}
                                >
                                    <img src={img} className="w-full h-full object-contain" alt="" />
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 bg-white border border-[#eee] rounded-[4px] aspect-square flex items-center justify-center relative cursor-zoom-in group overflow-hidden">
                            <img src={images[activeImage]} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" alt={product.product_name} />
                            {discount > 0 && (
                                <span className="absolute top-4 left-4 bg-[#cc0c39] text-white text-[11px] font-bold px-2 py-1 rounded-sm shadow-sm">-{discount}% Off</span>
                            )}
                        </div>
                    </div>

                    {/* ── COL 2: CENTER INFO ── */}
                    <div className="w-full lg:w-[35%] space-y-4">
                        <div className="border-b border-[#eee] pb-4 space-y-2">
                            <Link href="#" className="text-[14px] text-[#007185] hover:text-[#c45500] hover:underline font-medium block">
                                Brand: {product.supplier_name || 'Al-Qavi Distributor'}
                            </Link>
                            <h1 className="text-[24px] font-medium leading-tight text-[#0f1111]">
                                {product.product_name}
                            </h1>
                            <div className="flex items-center gap-2">
                                <AmazonStars count={4} reviews={145} />
                                <span className="text-[#ddd]">|</span>
                                <span className="text-[14px] text-[#007185] hover:text-[#c45500] hover:underline cursor-pointer">Answered Questions</span>
                            </div>
                        </div>

                        <div className="border-b border-[#eee] pb-4 space-y-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-[13px] text-[#565959] mt-1">Price:</span>
                                <span className="text-[28px] font-normal text-[#B12704]">
                                    <span className="text-[18px] align-top mr-0.5">Rs.</span>
                                    {price.toLocaleString()}
                                </span>
                            </div>
                            <p className="text-[14px] text-[#565959]">M.R.P.: <span className="line-through">Rs. {retailPrice.toLocaleString()}</span></p>
                            <p className="text-[14px] text-[#565959]">Inclusive of all taxes</p>
                        </div>

                        {/* Amazon Trust Icons */}
                        <div className="grid grid-cols-4 gap-2 py-4 border-b border-[#eee]">
                            {[
                                { icon: <RotateCcw size={24} className="text-[#565959]" />, label: "24 hours Replacement" },
                                { icon: <Truck size={24} className="text-[#565959]" />, label: "Free Delivery" },
                                { icon: <ShieldCheck size={24} className="text-[#565959]" />, label: "Genuine Product" },
                                { icon: <Package size={24} className="text-[#565959]" />, label: "Safe Shipping" },
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center text-center gap-1.5 px-1">
                                    <div className="w-10 h-10 flex items-center justify-center">{item.icon}</div>
                                    <span className="text-[11px] text-[#007185] leading-tight font-medium hover:underline cursor-pointer">{item.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* About this item */}
                        <div className="space-y-4 py-4">
                            <h3 className="text-[16px] font-bold">About this item</h3>
                            <ul className="list-disc ml-5 space-y-2 text-[14px] text-[#0f1111] leading-relaxed">
                                <li><span className="font-bold">Premium Choice:</span> Specially curated from the {product.supplier_name} Hub.</li>
                                {product.description ? (
                                    product.description.split('\n').filter(Boolean).map((line: string, i: number) => (
                                        <li key={i}>{line}</li>
                                    ))
                                ) : (
                                    <li>High-quality cosmetic product verified for distribution.</li>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* ── COL 3: BUY BOX ── */}
                    <div className="w-full lg:w-[20%] lg:sticky lg:top-24">
                        <div className="bg-white border border-[#ddd] rounded-[8px] p-5 shadow-sm space-y-4">
                            <div className="space-y-1">
                                <div className="text-[28px] font-medium">
                                    <span className="text-[18px] align-top mr-0.5">Rs.</span>
                                    {price.toLocaleString()}
                                </div>
                                <div className="flex items-center gap-1.5 py-1">
                                    <MapPin size={14} className="text-[#565959]" />
                                    <span className="text-[12px] text-[#007185] hover:text-[#c45500] hover:underline cursor-pointer">Deliver to Pakistan</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className={`text-[18px] font-bold ${inStock ? 'text-[#007600]' : 'text-[#cc0c39]'}`}>
                                    {inStock ? 'In Stock' : 'Currently Unavailable'}
                                </p>
                                <p className="text-[12px] text-[#0f1111]">Ships from <span className="font-bold">Al-Qavi Hub</span></p>
                                <p className="text-[12px] text-[#0f1111]">Sold by <span className="font-bold">{product.supplier_name || 'Direct Shop'}</span></p>
                            </div>

                            {inStock && (
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center gap-2 mb-4 bg-[#f0f2f2] border border-[#d5d9d9] rounded-[7px] p-1 w-fit">
                                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 hover:bg-white flex items-center justify-center rounded transition-colors"><Minus size={14} /></button>
                                        <span className="w-8 text-center text-[14px] font-bold">{quantity}</span>
                                        <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 hover:bg-white flex items-center justify-center rounded transition-colors"><Plus size={14} /></button>
                                    </div>

                                    <button
                                        onClick={() => addToCart({ ...product, quantity, image: product.image, selling_price: price })}
                                        className="w-full h-[35px] bg-[#ffd814] hover:bg-[#f7ca00] border border-[#fcd200] rounded-[20px] text-[13px] font-medium shadow-sm transition-all"
                                    >
                                        Add to Cart
                                    </button>
                                    <button
                                        onClick={() => { addToCart({ ...product, quantity, image: product.image, selling_price: price }); router.push('/checkout'); }}
                                        className="w-full h-[35px] bg-[#ffa41c] hover:bg-[#f3a847] border border-[#ff9900] rounded-[20px] text-[13px] font-medium shadow-sm transition-all"
                                    >
                                        Buy Now
                                    </button>
                                </div>
                            )}

                            <div className="pt-4 border-t border-[#eee] flex items-center gap-2">
                                <Lock size={14} className="text-[#565959]" />
                                <span className="text-[12px] text-[#007185] hover:text-[#c45500] hover:underline cursor-pointer font-medium">Secure transaction</span>
                            </div>

                            <button className="w-full py-2 text-[13px] text-[#0f1111] bg-white border border-[#adb1b8] rounded-[8px] hover:bg-[#f7f8fa] transition-all shadow-sm">
                                Add to Wish List
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── TECHNICAL DETAILS ── */}
                <div className="mt-16 pt-10 border-t border-[#eee]">
                    <h2 className="text-[20px] font-bold mb-6">Technical Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20">
                        <table className="w-full text-[14px]">
                            <tbody className="divide-y divide-[#eee]">
                                <tr className="border-t border-[#eee]">
                                    <td className="py-3 px-4 bg-[#f3f3f3] font-bold w-[40%] text-slate-700">Brand</td>
                                    <td className="py-3 px-4 text-slate-900">{product.supplier_name || 'Premium Beauty'}</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 bg-[#f3f3f3] font-bold text-slate-700">Category</td>
                                    <td className="py-3 px-4 text-slate-900">{product.category_name}</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 bg-[#f3f3f3] font-bold text-slate-700">SKU Number</td>
                                    <td className="py-3 px-4 font-mono text-slate-900">{product.sku || 'AQT-' + id.slice(0, 8).toUpperCase()}</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 bg-[#f3f3f3] font-bold text-slate-700">UPC / Barcode</td>
                                    <td className="py-3 px-4 font-mono text-slate-900">{product.barcode || '8901234567890'}</td>
                                </tr>
                            </tbody>
                        </table>
                        <table className="w-full text-[14px] mt-4 md:mt-0">
                            <tbody className="divide-y divide-[#eee]">
                                <tr className="border-t border-[#eee]">
                                    <td className="py-3 px-4 bg-[#f3f3f3] font-bold w-[40%] text-slate-700">Item Weight</td>
                                    <td className="py-3 px-4 text-slate-900">{product.batch || '250g'}</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 bg-[#f3f3f3] font-bold text-slate-700">Manufacturer</td>
                                    <td className="py-3 px-4 text-slate-900">{product.supplier_name || 'Al-Qavi Distributor'}</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 bg-[#f3f3f3] font-bold text-slate-700">Status</td>
                                    <td className="py-3 px-4 text-slate-900">{inStock ? 'Available' : 'Pre-Order Only'}</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 bg-[#f3f3f3] font-bold text-slate-700">Customer Rating</td>
                                    <td className="py-3 px-4 text-slate-900">4.5 out of 5 stars</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── RELATED PRODUCTS ── */}
                {relatedProducts.length > 0 && (
                    <div className="mt-20 pt-10 border-t border-[#eee]">
                        <h2 className="text-[20px] font-bold mb-6">Inspired by your shopping trend</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-6">
                            {relatedProducts.map(p => (
                                <Link key={p.id} href={`/customer/product/${p.id}`} className="group space-y-2">
                                    <div className="aspect-square bg-[#f8f8f8] rounded-[4px] p-4 flex items-center justify-center overflow-hidden border border-transparent group-hover:border-[#eee] transition-all">
                                        <img src={getImageUrl(p.image || p.catalog_image) || '/images/logo.png'} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform" alt="" />
                                    </div>
                                    <h3 className="text-[13px] text-[#007185] hover:text-[#c45500] hover:underline line-clamp-2 leading-snug font-medium">{p.product_name}</h3>
                                    <div className="text-[15px] font-bold text-[#B12704]">Rs. {parseFloat(p.selling_price || p.price).toLocaleString()}</div>
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
