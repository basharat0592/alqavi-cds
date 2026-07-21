'use client';

import PageLoader from '@/components/ui/PageLoader';
import { useState, useEffect, Suspense } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { productService } from '@/lib/api';
import { Star } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { cn, getImageUrl } from '@/lib/utils';
import { Toast } from '@/components/ui/QaviStyles';
import ProductCard from '@/components/ui/ProductCard';

function CategoryContent({ category }: { category: string }) {
    const { addToCart } = useCart();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtered, setFiltered] = useState<any[]>([]);
    const [priceRange, setPriceRange] = useState<string | null>(null);
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
        let r = products.filter(p => {
            const cName = (p.category_name || p.category?.name || '').toLowerCase();
            return cName.includes(category.toLowerCase());
        });

        if (priceRange) {
            r = r.filter(p => {
                const price = parseFloat(p.selling_price || p.price || 0);
                if (priceRange === 'Under 1000') return price < 1000;
                if (priceRange === '1000-5000') return price >= 1000 && price <= 5000;
                if (priceRange === '5000-10000') return price >= 5000 && price <= 10000;
                if (priceRange === 'Above 10000') return price > 10000;
                return true;
            });
        }

        const groups = new Map();
        r.forEach(p => {
            const name = (p.product_name || p.name || '').toLowerCase().trim();
            const price = parseFloat(p.selling_price || p.price || 0);
            const key = `${name}_${price}`;
            if (!groups.has(key)) groups.set(key, p);
        });
        setFiltered(Array.from(groups.values()));
    }, [products, priceRange, category]);

    const handleAddToCart = (p: any, qty: number = 1) => {
        const catName = p.category_name || p.category?.name || 'Beauty';
        const finalImage = p.image || p.catalog_image || p.image_url || '';
        addToCart({
            id: p.id,
            name: p.product_name || p.name,
            price: p.selling_price || p.price,
            quantity: qty,
            image: finalImage,
            category: catName,
            stock: p.total_quantity || p.quantity_in_stock
        });
        setToastMsg(`${qty} x ${p.name} added to cart!`);
        setTimeout(() => setToastMsg(''), 3000);
    };

    if (loading) return <PageLoader />;

    return (
        <div className="min-h-screen bg-[#f3f3f3] font-sans">
            <Navbar />
            <main className="max-w-[1500px] mx-auto px-4 py-6">
                <div className="flex flex-col lg:flex-row gap-6">
                    <aside className="w-full lg:w-64 flex-shrink-0 bg-white p-4 border border-slate-200 rounded-sm">
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 mb-2">Category</h3>
                                <div className="text-[#0891B2] font-bold text-sm">{category}</div>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 mb-2">Customer Reviews</h3>
                                <div className="space-y-2">
                                    {[4, 3, 2, 1].map(r => (
                                        <div key={r} className="flex items-center gap-1 group cursor-pointer">
                                            <div className="flex items-center">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={16} className={i < r ? 'fill-[#13B0D1] text-[#13B0D1]' : 'text-slate-300'} />
                                                ))}
                                            </div>
                                            <span className="text-sm text-slate-700 group-hover:text-[#0891B2]">& Up</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 mb-2">Price</h3>
                                <div className="space-y-1">
                                    {[
                                        { label: 'All Prices', value: null },
                                        { label: 'Under PKR 1,000', value: 'Under 1000' },
                                        { label: 'PKR 1,000 - 5,000', value: '1000-5000' },
                                        { label: 'PKR 5,000 - 10,000', value: '5000-10000' },
                                        { label: 'Over PKR 10,000', value: 'Above 10000' }
                                    ].map(range => (
                                        <button key={range.label} onClick={() => setPriceRange(range.value)}
                                            className={cn("block text-sm hover:text-[#0891B2] transition-colors", priceRange === range.value ? "font-bold text-slate-900" : "text-slate-700")}>
                                            {range.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>

                    <div className="flex-1">
                        <div className="bg-white p-4 border border-slate-200 rounded-sm mb-4 flex items-center justify-between">
                            <div className="text-sm text-slate-700">
                                <span className="font-bold">1-{filtered.length}</span> of results for <span className="text-[#0891B2] font-bold ml-1">"{category}"</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {filtered.map((p) => (
                                <ProductCard
                                    key={p.id}
                                    id={String(p.id)}
                                    title={(p.product_name || p.name || '').replace(/\s*\(.*?\)\s*$/, '').trim()}
                                    description={p.description}
                                    image={getImageUrl(p.image_url || p.image || p.catalog_image || '') || undefined}
                                    price={parseFloat(p.selling_price || p.price || 0)}
                                    originalPrice={p.original_price}
                                    category={p.category_name || 'Beauty'}
                                        city={p.warehouse_area}
                                        branch={p.warehouse_name}
                                    stock={p.quantity_in_stock || p.total_quantity}
                                    onAddToCart={(qty) => handleAddToCart(p, qty)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
            {toastMsg && <Toast message={toastMsg} />}
        </div>
    );
}

export default function CategoryPage() {
    return (
        <Suspense fallback={<PageLoader />}>
            <CategoryContent category="Skincare" />
        </Suspense>
    );
}
