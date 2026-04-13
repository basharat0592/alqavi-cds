'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    User, Mail, Phone, MapPin, Building2, ShieldCheck, Play, ArrowLeft, Archive, AlertTriangle, X, RefreshCw
} from 'lucide-react';
import { userService, AppUser, productService } from '@/lib/api';
import toast from 'react-hot-toast';
import PageLoader from '@/components/ui/PageLoader';
import Link from 'next/link';
import { getImageUrl } from '@/lib/utils';
import { Product } from '@/types';

export default function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [supplier, setSupplier] = useState<AppUser | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            try {
                const s = await userService.getById(parseInt(id));
                setSupplier(s);

                const allProducts = await productService.getAll();
                const filteredProducts = allProducts.filter((p: Product) => 
                    (p.supplier && typeof p.supplier === 'object' && p.supplier.id === parseInt(id)) ||
                    (p.supplier === parseInt(id)) || 
                    (p.created_by_name && p.created_by_name.includes(s.first_name))
                );
                setProducts(filteredProducts);

            } catch (err) {
                console.error(err);
                toast.error('Failed to load supplier details');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id]);

    if (loading) return <PageLoader />;
    if (!supplier) return <div className="text-center p-20 text-slate-500">Supplier not found.</div>;

    const initials = `${supplier.first_name?.[0] || ''}${supplier.last_name?.[0] || ''}`.toUpperCase();

    return (
        <div className="max-w-[1400px] mx-auto pb-20 px-4 mt-8 font-sans">
            <button
                onClick={() => router.push('/admin/company/suppliers')}
                className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#F59E0B] transition-colors mb-6 uppercase tracking-widest"
            >
                <ArrowLeft className="h-4 w-4" /> Back to Registry
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ── LEFT: PROFILE CARD ── */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl shadow-black/5 overflow-hidden">
                        <div className="bg-slate-50 dark:bg-white/5 px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-white/10">
                            <h2 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.2em]">Supplier Identity</h2>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${supplier.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                {supplier.is_active ? 'Active Node' : 'Offline Node'}
                            </span>
                        </div>
                        
                        <div className="p-8 flex flex-col items-center border-b border-slate-100 dark:border-white/10">
                            <div className="h-24 w-24 bg-[#F59E0B]/10 border-4 border-[#F59E0B] text-[#F59E0B] rounded-3xl flex items-center justify-center font-black text-3xl shadow-lg mb-4">
                                {initials}
                            </div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{supplier.first_name} {supplier.last_name}</h1>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">{supplier.business_name || 'Individual Entity'}</p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="flex items-start gap-4 p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                                <Mail className="h-5 w-5 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comm Link</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{supplier.email}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-4 p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                                <Phone className="h-5 w-5 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secure Comms</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{supplier.phone_number || supplier.phone || 'Classified'}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-4 p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                                <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Origin Point</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{supplier.address || 'Location Unknown'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: PRODUCTS SUPPLIED ── */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl shadow-black/5 overflow-hidden">
                        <div className="bg-slate-50 dark:bg-white/5 px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-white/10">
                            <div className="flex items-center gap-3">
                                <Building2 className="h-5 w-5 text-[#F59E0B]" />
                                <h2 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.2em]">Catalogs Managed</h2>
                            </div>
                            <span className="text-[10px] font-black px-2 py-1 bg-white dark:bg-[#1a252f] border border-slate-200 dark:border-white/10 rounded-lg">
                                {products.length} Assets
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-widest">Asset Details</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-widest text-center">Acquisition Price</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-widest text-center">Availability</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 whitespace-nowrap uppercase tracking-widest text-right">Visibility</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {products.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-16 text-center text-slate-400">
                                                <Archive className="h-12 w-12 mx-auto opacity-20 mb-3" />
                                                <p className="text-xs font-bold uppercase tracking-widest">No assets associated</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        products.map(p => (
                                            <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-slate-100 dark:bg-white/5 rounded-lg overflow-hidden shrink-0">
                                                            <img src={getImageUrl((p.image_url || p.image || '') as string) || "https://images.unsplash.com/photo-1596462502278-27bfdd403cc2?w=800"} className="w-full h-full object-cover" alt="" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight leading-tight">{p.name}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{p.sku || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-sm font-black text-indigo-500">Rs. {Number(p.cost_price || p.cost || 0).toLocaleString()}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${p.quantity_in_stock && p.quantity_in_stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                        {p.quantity_in_stock || 0} Units
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {p.is_supplier_only ? (
                                                        <span className="px-2 py-1 bg-[#F59E0B]/10 text-[#F59E0B] rounded text-[9px] font-black uppercase tracking-widest border border-[#F59E0B]/20">Isolated</span>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-[9px] font-black uppercase tracking-widest border border-blue-200 dark:border-blue-800">Public</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
