'use client';

import {
    Heart,
    ShoppingBag,
    Search,
    Package,
    ChevronRight,
    ArrowRight,
    Trash2,
    ShoppingCart,
    Plus
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { getImageUrl } from '@/lib/utils';

export default function WishlistDashboard() {
    const { wishlist, removeFromWishlist } = useWishlist();
    const { addToCart } = useCart();
    const router = useRouter();

    const handleAddToCart = (item: any, isBuyNow: boolean = false) => {
        addToCart({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            image: item.image,
            category: item.category
        });
        if (isBuyNow) {
            router.push('/checkout');
        }
    };

    return (
        <div className="max-w-[900px] mx-auto animate-in fade-in duration-500 pb-20">

            {/* Header */}
            <div className="flex items-center justify-between border-b pb-6 mb-8">
                <div>
                    <h1 className="text-3xl font-medium text-slate-900">Your Wishlist</h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Items you've saved for later. Prices and availability may change.</p>
                </div>
                <Link href="/shop" className="text-sm font-bold text-[#F59E0B] hover:text-[#F59E0B] hover:underline flex items-center gap-1">
                    Continue Shopping <ChevronRight className="h-4 w-4" />
                </Link>
            </div>

            {wishlist.length > 0 ? (
                <div className="space-y-1">
                    {wishlist.map((item) => (
                        <div key={item.id} className="flex flex-col md:flex-row items-center gap-8 py-8 border-b border-gray-100 last:border-0 group">
                            
                            {/* Product Image */}
                            <div className="w-40 h-40 bg-white border border-gray-100 rounded-lg p-2 flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                                <img
                                    src={getImageUrl(item.image) || '/placeholder.png'}
                                    alt=""
                                    className="w-full h-full object-contain"
                                />
                            </div>

                            {/* Product Details */}
                            <div className="flex-1 text-center md:text-left">
                                <div className="mb-2">
                                    <Link href={`/product/${item.id}`} className="text-lg font-bold text-slate-900 hover:text-[#F59E0B] transition-colors line-clamp-2 leading-snug">
                                        {item.name}
                                    </Link>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1.5">{item.category}</p>
                                </div>
                                <div className="flex items-center justify-center md:justify-start gap-4 mt-4">
                                    <p className="text-xl font-bold text-slate-900 tracking-tight">
                                        PKR {parseFloat(item.price.toString()).toLocaleString()}
                                    </p>
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded border border-emerald-100">In Stock</span>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-2 italic">Added on {new Date(item.addedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>

                            {/* Actions Column */}
                            <div className="flex flex-col gap-2.5 w-full md:w-52">
                                <button
                                    onClick={() => handleAddToCart(item, false)}
                                    className="w-full py-2 bg-[#F59E0B] hover:bg-[#F59E0B] border border-[#1a1a2e] rounded-full text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-all"
                                >
                                    <ShoppingCart className="h-4 w-4" /> Add to Cart
                                </button>
                                <button
                                    onClick={() => handleAddToCart(item, true)}
                                    className="w-full py-2 bg-[#F59E0B] text-white hover:bg-[#1E40AF] rounded-full text-xs font-bold shadow-sm transition-all"
                                >
                                    Buy it now
                                </button>
                                <button
                                    onClick={() => removeFromWishlist(item.id)}
                                    className="w-full py-2 text-[#F59E0B] hover:text-red-700 hover:underline text-xs font-medium mt-1 flex items-center justify-center gap-1.5"
                                >
                                    <Trash2 className="h-3.5 w-3.5" /> Delete from list
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-24 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <Heart className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Your wishlist is empty</h3>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto mb-8">Save items you're interested in by tapping the heart icon on any product in our store.</p>
                    <Link href="/shop" className="px-10 py-2 bg-[#F59E0B] text-white font-bold rounded-lg hover:bg-[#1E40AF] transition-all">
                        Go Shopping
                    </Link>
                </div>
            )}
        </div>
    );
}
