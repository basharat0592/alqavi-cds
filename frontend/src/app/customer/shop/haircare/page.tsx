'use client';

import PageLoader from '@/components/ui/PageLoader';
import { useState, useEffect, Suspense } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { productService } from '@/lib/api';
import { cn, getImageUrl } from '@/lib/utils';
import ProductCard from '@/components/ui/ProductCard';

function CategoryContent({ category }: { category: string }) {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtered, setFiltered] = useState<any[]>([]);
    const [priceRange, setPriceRange] = useState<string | null>(null);

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

    if (loading) return <PageLoader />;

    return (
        <div className="min-h-screen bg-white font-sans text-[#111]">
            <Navbar />

            <div className="bg-white border-b border-[#D5D9D9] py-5 mb-10">
                <div className="max-w-[1440px] mx-auto px-6">
                    <h1 className="text-[28px] font-bold tracking-tight uppercase">{category} Care Department</h1>
                    <p className="text-[14px] text-[#565959] mt-1 font-medium">Curated regional inventory of premium cosmetics and authentic skincare</p>
                </div>
            </div>

            <main className="max-w-[1440px] mx-auto px-6 pb-32">
                <div className="flex flex-col lg:flex-row gap-12">

                    <aside className="w-full lg:w-72 flex-shrink-0 space-y-10">
                        <div className="p-8 border border-[#D5D9D9] rounded-[12px] bg-[#f7f8fa]">
                            <h3 className="text-[12px] font-black text-[#565959] uppercase tracking-[0.2em] mb-6">Department Filter</h3>

                            <div className="space-y-8">
                                <div>
                                    <h4 className="text-[14px] font-bold mb-4 uppercase tracking-tight">Price Structure</h4>
                                    <div className="space-y-2">
                                        {[
                                            { label: 'All Wholesale Prices', value: null },
                                            { label: 'Under PKR 1,000', value: 'Under 1000' },
                                            { label: 'PKR 1,000 - 5,000', value: '1000-5000' },
                                            { label: 'PKR 5,000 - 10,000', value: '5000-10000' },
                                            { label: 'Over PKR 10,000', value: 'Above 10000' }
                                        ].map(range => (
                                            <button
                                                key={range.label}
                                                onClick={() => setPriceRange(range.value)}
                                                className={cn(
                                                    "block text-[13px] hover:text-[#119AB8] transition-colors uppercase tracking-tight",
                                                    priceRange === range.value ? "font-bold text-[#111]" : "text-[#565959] font-medium"
                                                )}
                                            >
                                                {range.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border border-[#D5D9D9] rounded-[12px] bg-white">
                            <h4 className="text-[12px] font-black text-[#565959] uppercase tracking-[0.2em] mb-4">Quality Verified</h4>
                            <p className="text-[11px] text-[#565959] leading-relaxed font-medium">All items are sourced directly from authorized regional suppliers with guaranteed authenticity.</p>
                        </div>
                    </aside>

                    <div className="flex-1">
                        {filtered.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-8">
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
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-[#f7f8fa] p-24 border border-[#D5D9D9] rounded-[12px] text-center">
                                <h3 className="text-[24px] font-bold uppercase tracking-tight mb-4">No items found</h3>
                                <p className="text-[#565959] text-[14px] font-medium mb-8">Try adjusting your price filters or explore other regional categories.</p>
                                <button
                                    onClick={() => setPriceRange(null)}
                                    className="px-10 py-4 bg-[#111] text-white rounded-[8px] text-[12px] font-bold uppercase tracking-[0.2em] hover:bg-[#333] transition-all"
                                >
                                    View Full Catalog
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default function HaircarePage() {
    return (
        <Suspense fallback={<PageLoader />}>
            <CategoryContent category="Hair" />
        </Suspense>
    );
}
