'use client';

import PageLoader from '@/components/ui/PageLoader';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { productService } from '@/lib/api';
import { Search, X, LayoutGrid, List, Sliders, ChevronRight, CheckCircle, Star } from 'lucide-react';

import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { getImageUrl } from '@/lib/utils';
import { Toast } from '@/components/ui/QaviStyles';
import ProductCard from '@/components/ui/ProductCard';


function ShopContent() {
    const { addToCart } = useCart();
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get('q') || searchParams.get('search') || '';
    const catQuery = searchParams.get('cat') || searchParams.get('category') || '';
    const mcatQuery = searchParams.get('mcat') || '';

    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtered, setFiltered] = useState<any[]>([]);
    const [selectedCat, setSelectedCat] = useState<string>(catQuery);
    const [toastMsg, setToastMsg] = useState('');

    useEffect(() => {
        productService.getAll()
            .then(d => {
                const api = Array.isArray(d) ? d : (d as any).results || [];
                setProducts(api);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        let r = [...products];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            r = r.filter(p => p.name?.toLowerCase().includes(q) || p.category_name?.toLowerCase().includes(q));
        }
        if (selectedCat) {
            r = r.filter(p => p.category_name?.toLowerCase().includes(selectedCat.toLowerCase()));
        }
        if (mcatQuery) {
            const mq = mcatQuery.toLowerCase();
            r = r.filter(p => p.main_category_names?.some((n: string) => n.toLowerCase() === mq));
        }
        setFiltered(r);
    }, [products, searchQuery, selectedCat, mcatQuery]);

    const cats = Array.from(new Set(products.map(p => p.category_name).filter(Boolean))) as string[];

    const handleAddToCart = (p: any, qty: number = 1) => {
        addToCart({ 
            id: p.id, 
            name: p.name, 
            price: p.price, 
            quantity: qty, 
            image: p.image_url || p.image || '', 
            category: p.category_name || 'Beauty', 
            stock: p.quantity_in_stock 
        });
        setToastMsg(`${qty} x ${p.name} added to cart!`);
        setTimeout(() => setToastMsg(''), 3000);
    };

    if (loading) return <PageLoader />;

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* ── TOP RESULTS SUMMARY (AMAZON STYLE) ── */}
            <div className="border-b border-gray-200 bg-white shadow-sm sticky top-[64px] z-30">
                <div className="container mx-auto px-4 py-2.5 flex items-center justify-between">
                    <div className="text-[14px]">
                        <span className="text-[#565959] font-medium">
                            {filtered.length > 0 ? `1-${filtered.length}` : '0'} of over {products.length} results for 
                        </span>
                        <span className="text-[#c45500] font-black ml-1.5 uppercase tracking-tight">
                            "{selectedCat || mcatQuery || searchQuery || 'All Departments'}"
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <select className="text-[12px] font-bold bg-[#F0F2F2] border border-[#D5D9D9] rounded-md px-3 py-1.5 outline-none focus:border-[#e77600] shadow-sm cursor-pointer">
                            <option>Sort by: Featured</option>
                            <option>Price: Low to High</option>
                            <option>Price: High to Low</option>
                            <option>Avg. Customer Review</option>
                        </select>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-10">

                    {/* ── Amazon Filter Sidebar ── */}
                    <aside className="w-full lg:w-60 flex-shrink-0 animate-in fade-in slide-in-from-left duration-500">
                        <div className="space-y-8 sticky top-[130px]">
                            
                            {/* Department Selection */}
                            <div>
                                <h3 className="text-[14px] font-black text-[#111] mb-2 uppercase tracking-tight">Department</h3>
                                <ul className="space-y-1.5 ml-1">
                                    <li>
                                        <button
                                            onClick={() => setSelectedCat('')}
                                            className={`text-[13px] block transition-all hover:text-[#c45500] hover:underline
                                                ${!selectedCat ? 'font-black text-[#111]' : 'text-[#444]'}`}
                                        >
                                            Every Category
                                        </button>
                                    </li>
                                    {cats.map(c => (
                                        <li key={c}>
                                            <button
                                                onClick={() => setSelectedCat(c)}
                                                className={`text-[13px] block transition-all hover:text-[#c45500] hover:underline
                                                    ${selectedCat === c ? 'font-black text-[#111]' : 'text-[#444]'}`}
                                            >
                                                {c}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Customer Review */}
                            <div>
                                <h3 className="text-[14px] font-black text-[#111] mb-2 uppercase tracking-tight">Customer Review</h3>
                                <div className="space-y-1.5 ml-1">
                                    {[4, 3, 2, 1].map(stars => (
                                        <div key={stars} className="flex items-center gap-1 cursor-pointer group">
                                            <div className="flex text-[#F59E0B]">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star key={i} size={14} className={i < stars ? 'fill-[#F59E0B]' : 'text-gray-300'} />
                                                ))}
                                            </div>
                                            <span className="text-[13px] text-[#444] group-hover:text-[#c45500]">& Up</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Price Filter */}
                            <div>
                                <h3 className="text-[14px] font-black text-[#111] mb-2 uppercase tracking-tight">Price</h3>
                                <ul className="space-y-1.5 ml-1">
                                    {['Under PKR 1,000', 'PKR 1,000 to PKR 5,000', 'PKR 5,000 to PKR 10,000', 'Above PKR 10,000'].map(p => (
                                        <li key={p}>
                                            <button className="text-[13px] text-[#444] hover:text-[#c45500] hover:underline transition-all">
                                                {p}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Certifications Card */}
                            <div className="p-4 bg-[#F8F8F8] border border-[#D5D9D9] rounded-lg shadow-inner-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1 bg-emerald-500 rounded-full">
                                        <CheckCircle size={12} className="text-white" />
                                    </div>
                                    <p className="text-[12px] font-black text-[#111] uppercase tracking-tight">Certified Authentic</p>
                                </div>
                                <p className="text-[10px] text-[#565959] leading-relaxed font-medium">
                                    Every product in our shop is strictly verified for chemical standards and purity compliance by our quality control laboratory.
                                </p>
                            </div>
                        </div>
                    </aside>

                    {/* ── Product Grid ── */}
                    <div className="flex-1">
                        {filtered.length > 0 ? (
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10">
                                {filtered.map(p => (
                                    <div key={p.id} className="animate-in fade-in duration-500">
                                        <ProductCard
                                            id={String(p.id)}
                                            title={p.name}
                                            image={getImageUrl(p.image_url || p.image || '') || undefined}
                                            price={typeof p.price === 'string' ? parseFloat(p.price) : (p.price || 0)}
                                            category={p.category_name || 'Beauty'}
                                            stock={p.quantity_in_stock}
                                            rating={4.5}
                                            reviews={p.reviews_count || 12}
                                            onAddToCart={(qty) => handleAddToCart(p, qty)}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 bg-[#F8F8F8] border border-[#D5D9D9] border-dashed rounded-xl animate-in zoom-in-95 duration-500">
                                <Search size={48} className="text-gray-300 mb-6" />
                                <h2 className="text-[20px] font-black text-[#111] uppercase tracking-wider mb-2">No Matching Results</h2>
                                <p className="text-[13px] text-[#565959] max-w-sm text-center mb-8 px-6">
                                    We couldn't find any products matching your current search parameters. Try broadening your keywords or clearing filters.
                                </p>
                                <button 
                                    onClick={() => { setSelectedCat(''); }} 
                                    className="px-10 py-3 bg-[#F59E0B] text-white font-black text-[11px] uppercase tracking-widest rounded-lg shadow-xl shadow-[#F59E0B]/20 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
            {toastMsg && <Toast message={toastMsg} />}
        </div>
    );
}

export default function Shop() {
    return (
        <Suspense fallback={<PageLoader />}>
            <ShopContent />
        </Suspense>
    );
}
