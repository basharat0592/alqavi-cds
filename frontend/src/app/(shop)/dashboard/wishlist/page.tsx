'use client';

import { 
    Heart, 
    ShoppingBag, 
    Search, 
    Package, 
    ChevronRight,
    ArrowRight,
    Trash2,
    ShoppingCart
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
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            
            {/* ── HEADER (Admin Style) ── */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded border border-gray-100 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">My Wishlist</h1>
                    <p className="text-[10px] font-bold text-[#FF9900] tracking-[0.2em] uppercase mt-0.5">Your curated beauty collection</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded border border-gray-100 dark:border-slate-700">
                        {wishlist.length} Items Saved
                    </span>
                    <Link href="/shop" className="px-5 py-2.5 bg-[#FF9900] text-[#131921] font-black text-[10px] uppercase tracking-widest rounded shadow-lg shadow-[#FF9900]/20 hover:bg-[#e68a00] transition-all">
                        Explore Shop
                    </Link>
                </div>
            </div>

            {wishlist.length > 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Price</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Date Added</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                                {wishlist.map((item) => (
                                    <tr key={item.id} className="group hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-1 flex-shrink-0">
                                                    <img 
                                                        src={getImageUrl(item.image) || '/placeholder.png'} 
                                                        alt="" 
                                                        className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" 
                                                    />
                                                </div>
                                                <div>
                                                    <Link href={`/product/${item.id}`} className="text-sm font-black text-slate-900 dark:text-white hover:text-[#FF9900] transition-colors leading-tight">
                                                        {item.name}
                                                    </Link>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{item.category}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-black text-slate-900 dark:text-white tracking-widest">
                                                PKR {parseFloat(item.price.toString()).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                                                {new Date(item.addedAt).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleAddToCart(item, true)}
                                                    className="p-2.5 bg-slate-900 text-white rounded hover:bg-black transition-all flex items-center gap-2"
                                                    title="Buy Now"
                                                >
                                                    <ShoppingCart className="h-4 w-4" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest hidden md:inline">Buy Now</span>
                                                </button>
                                                <button 
                                                    onClick={() => removeFromWishlist(item.id)}
                                                    className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded transition-all"
                                                    title="Remove from Wishlist"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded shadow-sm p-16 text-center">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-6 border border-slate-100 dark:border-slate-700">
                        <Heart className="h-10 w-10 text-slate-200" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Workspace Empty</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8 max-w-[250px] mx-auto leading-relaxed">
                        No items found in your collection. Explore the store and tap the heart icon to save products.
                    </p>
                    <Link href="/shop" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded hover:bg-black transition-all">
                        <span>Go Shopping</span>
                        <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>
            )}
        </div>
    );
}
