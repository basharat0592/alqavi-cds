'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { productService } from '@/lib/api';
import { Search, X, LayoutGrid, List, Sliders, ChevronRight, CheckCircle } from 'lucide-react';

import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { getImageUrl } from '@/lib/utils';
import { Toast } from '@/components/ui/AmazonStyles';
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
                setProducts(api.filter((p: any) => p.status === 'active'));
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
        addToCart({ id: p.id, name: p.name, price: p.price, quantity: qty, image: p.image_url || p.image || '', category: p.category_name || 'Beauty', stock: p.quantity_in_stock });
        setToastMsg(`${qty} x ${p.name} added to cart!`);
        setTimeout(() => setToastMsg(''), 3000);
    };

    return (
        <div className="min-h-screen bg-white dark:bg-background">
            <Navbar />

            {/* Breadcrumb / Top Bar */}
            <div className="border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="text-sm font-medium dark:text-gray-300">
                        <span className="text-gray-500">Shop</span>
                        <ChevronRight className="h-4 w-4 inline text-gray-400" />
                        <span className="font-bold text-[#0F1111] dark:text-white uppercase tracking-tighter">
                            {selectedCat || mcatQuery || searchQuery || 'All Departments'}
                        </span>
                    </div>
                    <div className="text-xs text-gray-500 font-bold uppercase tracking-widest leading-none">
                        Showing {filtered.length} Results
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    
                    {/* Simplified Amazon Sidebar */}
                    <aside className="w-full lg:w-64 flex-shrink-0 animate-in fade-in slide-in-from-left duration-500">
                        <div className="space-y-8 sticky top-24">
                            <div>
                                <h3 className="text-sm font-bold border-b border-gray-100 dark:border-slate-800 pb-2 mb-4 uppercase tracking-tighter">Related Department</h3>
                                <ul className="space-y-2">
                                    <li>
                                        <button 
                                            onClick={() => setSelectedCat('')}
                                            className={`text-sm tracking-tight ${!selectedCat ? 'font-bold text-[#C45500]' : 'text-[#007185] hover:text-[#C45500] hover:underline'}`}
                                        >
                                            Every Item
                                        </button>
                                    </li>
                                    {cats.map(c => (
                                        <li key={c}>
                                            <button 
                                                onClick={() => setSelectedCat(c)}
                                                className={`text-sm tracking-tight ${selectedCat === c ? 'font-bold text-[#C45500]' : 'text-[#007185] hover:text-[#C45500] hover:underline'}`}
                                            >
                                                {c}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold border-b border-gray-100 dark:border-slate-800 pb-2 mb-4 uppercase tracking-tighter">Pricing Overview</h3>
                                <ul className="space-y-2">
                                    {['Under 2,500', '2,500 – 7,500', '7,500 – 15,000', 'Above 15,000'].map(p => (
                                        <li key={p}>
                                            <button className="text-sm text-[#007185] hover:text-[#C45500] hover:underline tracking-tight">
                                                {p}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="p-4 bg-[#F8F8F8] dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-sm">
                                <p className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1 mb-2 tracking-tighter">
                                    <CheckCircle className="h-3 w-3 text-emerald-500" /> Qavi Authenticity Certified
                                </p>
                                <p className="text-[10px] text-gray-400 italic">Every piece is verified for purity and chemical standard compliance before dispatch.</p>
                            </div>
                        </div>
                    </aside>

                    {/* Simple Product Grid */}
                    <div className="flex-1">
                        {loading ? (
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-500">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="aspect-[1/1.5] bg-gray-50 dark:bg-slate-800 animate-pulse rounded-sm" />
                                ))}
                            </div>
                        ) : filtered.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filtered.map(p => (
                                    <ProductCard
                                        key={p.id}
                                        id={String(p.id)}
                                        title={p.name}
                                        image={getImageUrl(p.image_url || p.image || '') || ''}
                                        price={typeof p.price === 'string' ? parseFloat(p.price) : (p.price || 0)}
                                        category={p.category_name || 'Beauty'}
                                        stock={p.quantity_in_stock}
                                        rating={4.5}
                                        reviews={p.reviews_count || 12}
                                        onAddToCart={(qty) => handleAddToCart(p, qty)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-24 bg-gray-50 dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-800 animate-in zoom-in-95 duration-500">
                                <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <h2 className="text-xl font-bold dark:text-white">Empty Selection</h2>
                                <p className="text-sm text-gray-500 max-w-sm mx-auto mt-2">The curated search axis is zero. Broaden your search parameters or explore the main collection.</p>
                                <button onClick={() => { setSelectedCat(''); }} className="mt-8 px-8 py-2 bg-[#FF9900] hover:bg-[#e68a00] text-[#111] font-bold rounded text-xs uppercase shadow-sm">
                                    Reload Inventory
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
        <Suspense fallback={null}>
            <ShopContent />
        </Suspense>
    );
}
