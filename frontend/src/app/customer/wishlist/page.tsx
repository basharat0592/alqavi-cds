'use client';

import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ShoppingCart, Trash2, ShoppingBag, ArrowLeft, Heart, Sparkles, ShieldCheck, Truck, Star, Info } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from 'react-hot-toast';

export default function WishlistPage() {
    const { wishlist, removeFromWishlist, wishlistCount } = useWishlist();
    const { addToCart } = useCart();

    const sanitizeName = (name: string) => {
        return (name || '').replace(/\s*\(.*?\)\s*$/, '').trim();
    };

    return (
        <div className="min-h-screen bg-white font-sans text-[#0f1111]">
            <Navbar />

            {/* Same to Same Header as Tracking Page */}
            <div className="bg-white border-b border-[#D5D9D9] py-4 mb-10">
                <div className="max-w-[1240px] mx-auto px-6">
                    <h1 className="text-[24px] font-bold tracking-tight">Your Wishlist</h1>
                    <p className="text-[14px] text-[#565959] mt-1">Manage your curated collection of beauty essentials</p>
                </div>
            </div>

            <main className="max-w-[1100px] mx-auto px-6 pb-24">
                <div className="flex flex-col lg:flex-row gap-10">

                    {/* LEFT: Product List */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between border-b border-[#D5D9D9] pb-4 mb-8">
                            <h2 className="text-[18px] font-bold">Saved Items ({wishlistCount})</h2>
                            <Link href="/customer/shop" className="text-[13px] font-bold text-[#119AB8] hover:underline flex items-center gap-2">
                                <ArrowLeft size={16} /> Continue Shopping
                            </Link>
                        </div>

                        {wishlistCount === 0 ? (
                            <div className="text-center py-20 bg-[#f7f8fa] border border-[#D5D9D9] rounded-[8px]">
                                <ShoppingBag size={48} className="mx-auto text-[#D5D9D9] mb-4" />
                                <h3 className="text-[18px] font-bold mb-2">Your wishlist is empty</h3>
                                <p className="text-[13px] text-[#565959] mb-8">Click the heart icon on products to save them for later.</p>
                                <Link href="/customer/shop" className="inline-flex items-center px-8 py-2 bg-[#119AB8] text-white rounded-[8px] text-[13px] font-bold hover:bg-[#13B0D1] transition-colors shadow-sm">
                                    Browse Products
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <AnimatePresence mode="popLayout">
                                    {wishlist.map((item) => (
                                        <motion.div
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="p-6 border border-[#D5D9D9] rounded-[8px] flex flex-col md:flex-row gap-6 items-center hover:shadow-sm transition-shadow group"
                                        >
                                            {/* Image */}
                                            <Link href={`/customer/product/${item.id}`} className="w-24 h-24 bg-white border border-[#F0F2F2] rounded-[8px] p-2 flex items-center justify-center shrink-0">
                                                <img
                                                    src={item.image || '/images/logo.png'}
                                                    alt={item.name}
                                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                                />
                                            </Link>

                                            {/* Info */}
                                            <div className="flex-1 text-center md:text-left">
                                                <Link href={`/customer/product/${item.id}`}>
                                                    <h3 className="text-[16px] font-bold text-[#007185] hover:text-[#c45500] transition-colors leading-tight mb-1">{sanitizeName(item.name)}</h3>
                                                </Link>
                                                <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                                                    <span className="text-[12px] font-bold text-[#565959] uppercase">{item.category}</span>
                                                    {(item.type || item.weight) && (
                                                        <>
                                                            <span className="w-1 h-1 bg-[#D5D9D9] rounded-full" />
                                                            <span className="text-[12px] font-bold text-[#119AB8]">
                                                                {item.type} {item.weight && `• ${item.weight}`}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="mt-4 flex items-baseline justify-center md:justify-start gap-3">
                                                    <span className="text-[20px] font-bold text-[#111]">Rs. {Number(item.price).toLocaleString()}</span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                                <button
                                                    onClick={() => {
                                                        addToCart({
                                                            id: item.id,
                                                            name: item.name,
                                                            price: Number(item.price),
                                                            image: item.image,
                                                            category: item.category,
                                                            quantity: 1
                                                        });
                                                        toast.success('Added to bag!');
                                                    }}
                                                    className="px-6 py-2 bg-[#119AB8] text-white rounded-[8px] text-[13px] font-bold hover:bg-[#13B0D1] transition-colors shadow-sm flex items-center justify-center gap-2"
                                                >
                                                    <ShoppingCart size={16} /> Add to Cart
                                                </button>
                                                <button
                                                    onClick={() => removeFromWishlist(item.id)}
                                                    className="text-[12px] text-[#565959] hover:text-red-600 font-bold flex items-center justify-center gap-1 transition-colors"
                                                >
                                                    <Trash2 size={14} /> Remove Item
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Summary Sidebar */}
                    <aside className="w-full lg:w-80 space-y-6">
                        <div className="border border-[#D5D9D9] rounded-[8px] p-6 bg-[#f7f8fa]">
                            <h3 className="text-[15px] font-bold mb-6 pb-2 border-b border-[#D5D9D9]">Wishlist Summary</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between text-[14px]">
                                    <span className="text-[#565959]">Items</span>
                                    <span className="font-bold">{wishlistCount}</span>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-[#D5D9D9]">
                                    <span className="text-[16px] font-bold">Total Value</span>
                                    <span className="font-bold text-[18px] text-[#B12704]">Rs. {wishlist.reduce((acc, item) => acc + Number(item.price), 0).toLocaleString()}</span>
                                </div>
                                <button className="w-full py-2.5 bg-[#131921] text-white rounded-[8px] text-[13px] font-bold hover:bg-black transition-colors mt-4">
                                    Checkout Now
                                </button>
                            </div>

                            {/* Trust Badges */}
                            <div className="mt-10 space-y-6 pt-6 border-t border-[#D5D9D9]">
                                <div className="flex gap-3">
                                    <ShieldCheck className="text-[#119AB8] shrink-0" size={18} />
                                    <div>
                                        <h5 className="text-[12px] font-bold">Secure Selection</h5>
                                        <p className="text-[11px] text-[#565959] mt-0.5 leading-relaxed italic">Your saved items are encrypted.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Truck className="text-[#119AB8] shrink-0" size={18} />
                                    <div>
                                        <h5 className="text-[12px] font-bold">Priority Delivery</h5>
                                        <p className="text-[11px] text-[#565959] mt-0.5 leading-relaxed italic">GB specific logistics for saved items.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            <Footer />
        </div>
    );
}
