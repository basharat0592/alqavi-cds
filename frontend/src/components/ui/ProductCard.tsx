'use client';

import Link from 'next/link';
import { Star, ShoppingCart, Eye, Heart } from 'lucide-react';

interface ProductCardProps {
    id?: string;
    title: string;
    image: string;
    rating?: number;
    reviews?: number;
    price: number;
    category?: string;
    onAddToCart?: () => void;
}

export default function ProductCard({ 
    id = '#', 
    title, 
    image, 
    rating = 4.5, 
    reviews = 12, 
    price, 
    category = 'Cosmetic',
    onAddToCart 
}: ProductCardProps) {
    return (
        <div className="group relative bg-white dark:bg-slate-900 rounded-[2rem] p-4 border border-gray-100 dark:border-slate-800 hover:shadow-2xl hover:shadow-[#FF9900]/10 transition-all duration-500 overflow-hidden">
            {/* Quick Actions Overlay */}
            <div className="absolute top-6 right-6 z-10 flex flex-col gap-2 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500">
                <button className="w-10 h-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-xl flex items-center justify-center text-gray-900 dark:text-white hover:bg-[#FF9900] hover:text-white transition shadow-lg">
                    <Heart className="h-4 w-4" />
                </button>
                <button className="w-10 h-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-xl flex items-center justify-center text-gray-900 dark:text-white hover:bg-[#FF9900] hover:text-white transition shadow-lg">
                    <Eye className="h-4 w-4" />
                </button>
            </div>

            {/* Image Area */}
            <Link href={`/product/${id}`} className="block relative aspect-square rounded-[1.5rem] overflow-hidden bg-gray-50 dark:bg-slate-800 mb-6">
                <img 
                    src={image || 'https://images.unsplash.com/photo-1596462502278-27bfdd403cc2?q=80&w=400&auto=format&fit=crop'} 
                    alt={title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />
            </Link>

            {/* Content Area */}
            <div className="px-2">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] font-black text-[#FF9900] uppercase tracking-[0.2em]">{category}</p>
                    <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-[#FF9900] text-[#FF9900]" />
                        <span className="text-[10px] font-black text-gray-900 dark:text-white">{rating}</span>
                    </div>
                </div>

                <Link href={`/product/${id}`} className="block">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-[#FF9900] transition-colors mb-2 tracking-tight">
                        {title}
                    </h3>
                </Link>

                <div className="flex items-center justify-between mt-4 pb-2">
                    <div>
                        <p className="text-[9px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">Price</p>
                        <p className="text-lg font-black text-gray-900 dark:text-[#FF9900] tracking-tighter leading-none">
                            Rs. {price.toLocaleString()}
                        </p>
                    </div>
                    <button 
                        onClick={(e) => { e.preventDefault(); onAddToCart?.(); }}
                        className="w-10 h-10 bg-[#131921] dark:bg-slate-800 text-white rounded-xl flex items-center justify-center hover:bg-[#FF9900] transition-all shadow-lg active:scale-90"
                    >
                        <ShoppingCart className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
