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
            router.push('/customer/checkout');
        }
    };

    return (
        <div className="max-w-[1000px] mx-auto animate-in fade-in duration-500 pb-20">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-[#111]">Your Wishlist</h1>
                    <p className="text-sm text-gray-600 mt-1">Manage your saved items for future purchases.</p>
                </div>
                <Link href="/customer/dashboard" className="text-sm text-[#007185] hover:text-[#C45500] hover:underline">
                    Back to Account
                </Link>
            </div>

            {wishlist.length > 0 ? (
                <div className="divide-y divide-gray-100 bg-white border border-[#D5D9D9] rounded-lg">
                    {wishlist.map((item) => (
                        <div key={item.id} className="flex flex-col md:flex-row items-center gap-6 p-6 group">

                            {/* Product Image */}
                            <div className="w-40 h-40 bg-white flex-shrink-0">
                                <img
                                    src={getImageUrl(item.image) || '/placeholder.png'}
                                    alt=""
                                    className="w-full h-full object-contain"
                                />
                            </div>

                            {/* Product Details */}
                            <div className="flex-1">
                                <Link href={`/customer/product/${item.id}`} className="text-lg font-medium text-[#007185] hover:text-[#C45500] hover:underline line-clamp-2">
                                    {item.name}
                                </Link>
                                <div className="mt-1 flex items-center gap-2">
                                    <p className="text-sm font-bold text-[#111]">
                                        Rs. {parseFloat(item.price.toString()).toLocaleString()}
                                    </p>
                                    <span className="text-xs text-[#007600] font-bold">In Stock</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Added on {new Date(item.addedAt).toLocaleDateString()}</p>
                                
                                <div className="mt-4 flex gap-4">
                                    <button 
                                        onClick={() => removeFromWishlist(item.id)}
                                        className="text-xs text-[#007185] hover:text-[#C45500] hover:underline"
                                    >
                                        Delete from list
                                    </button>
                                </div>
                            </div>

                            {/* Actions Column */}
                            <div className="flex flex-col gap-2 w-full md:w-48 shrink-0">
                                <button
                                    onClick={() => handleAddToCart(item, false)}
                                    className="w-full py-1.5 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] rounded-full text-xs font-medium text-[#111] transition-all"
                                >
                                    Add to Cart
                                </button>
                                <button
                                    onClick={() => handleAddToCart(item, true)}
                                    className="w-full py-1.5 bg-white hover:bg-gray-50 border border-[#D5D9D9] rounded-full text-xs font-medium text-[#111] transition-all"
                                >
                                    Buy it now
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center bg-white border border-[#D5D9D9] rounded-lg">
                    <Heart className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-[#111] mb-2">Your wishlist is empty</h3>
                    <p className="text-sm text-gray-600 max-w-sm mx-auto mb-8">Save items you're interested in while browsing.</p>
                    <Link href="/customer" className="inline-block px-10 py-2.5 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] rounded-lg text-sm font-medium text-[#111]">
                        Continue Shopping
                    </Link>
                </div>
            )}
        </div>
    );
}
