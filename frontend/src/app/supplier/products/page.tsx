'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    Package, 
    Search, 
    ChevronRight, 
    PlusCircle,
    Edit,
    Trash2,
    ExternalLink,
    Box,
    Tag,
    Layers,
    DollarSign,
    MoreVertical
} from 'lucide-react';

export default function SupplierProducts() {
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(false);

    const MOCK_PRODUCTS = [
        { id: 1, name: "Glow Radiance Serum", sku: "GRS-2024-01", price: 4500, stock: 124, category: "Skincare", status: "Active" },
        { id: 2, name: "Matte Finish Foundation", sku: "MFF-2024-02", price: 3200, stock: 56, category: "Makeup", status: "Active" },
        { id: 3, name: "Midnight Recovery Oil", sku: "MRO-2024-03", price: 5800, stock: 12, category: "Skincare", status: "Low Stock" },
        { id: 4, name: "Velvet Lip Tint", sku: "VLT-2024-04", price: 1800, stock: 0, category: "Makeup", status: "Out of Stock" }
    ];

    return (
        <div className="max-w-[900px] mx-auto animate-in fade-in duration-500 pb-20">
            
            {/* Title Area - Same to same as Orders Page */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-medium text-slate-900">Your Catalog</h1>
                    <Link 
                        href="/supplier/products/add" 
                        className="px-6 py-2 bg-[#F7CA00] hover:bg-[#e6be00] text-slate-900 font-bold rounded-lg text-xs shadow-sm transition-all flex items-center gap-2"
                    >
                        <PlusCircle size={14} />
                        List New Item
                    </Link>
                </div>

                {/* Filter Tabs - Same to same as Orders Page */}
                <div className="flex gap-8 border-b border-gray-200">
                    {['all', 'active', 'low stock', 'out of stock'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            className={`
                                pb-3 text-sm font-bold capitalize transition-all border-b-2
                                ${filter === t
                                    ? 'border-[#F7CA00] text-slate-900'
                                    : 'border-transparent text-slate-500 hover:text-slate-900'
                                }
                            `}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Statistics Row - Same to same */}
            <p className="text-sm text-slate-600 mb-6 font-medium">
                <span className="font-bold">{MOCK_PRODUCTS.length} products</span> registered in 
                <span className="text-[#007185] hover:underline cursor-pointer ml-1 font-bold">your hub catalog</span>
            </p>

            {/* Product Cards - SAME TO SAME as Order Cards */}
            <div className="space-y-6">
                {MOCK_PRODUCTS.map(pkg => (
                    <div key={pkg.id} className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        
                        {/* Card Header (metadata) - Identical to Orders */}
                        <div className="bg-[#f0f2f2] border-b border-gray-300 px-6 py-4 flex flex-wrap items-center justify-between gap-6 text-[11px] font-medium text-slate-600 uppercase tracking-wider">
                            <div className="flex gap-10">
                                <div className="flex flex-col gap-1">
                                    <span>Division</span>
                                    <span className="text-sm font-bold text-slate-800 tracking-tight lowercase first-letter:uppercase">
                                        {pkg.category} Division
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span>Wholesale Price</span>
                                    <div className="hidden lg:block w-px h-12 bg-slate-200 dark:bg-white/10 mx-2" />
                                    <span className="text-sm font-bold text-slate-800 tracking-tight">PKR {pkg.price.toLocaleString()}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span>Stock Status</span>
                                    <span className={`text-sm font-bold tracking-tight capitalize ${pkg.stock > 15 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {pkg.stock} units available
                                    </span>
                                </div>
                            </div>
                            <div className="text-right flex flex-col gap-1">
                                <span>SKU # {pkg.sku}</span>
                                <div className="flex items-center gap-3 justify-end text-[#007185]">
                                    <Link href="#" className="hover:text-red-700 hover:underline">Edit Listing</Link>
                                    <div className="w-[1px] h-3 bg-gray-300" />
                                    <Link href="#" className="hover:text-red-700 hover:underline">Bulk Upload</Link>
                                </div>
                            </div>
                        </div>

                        {/* Card Content - Identical to Orders */}
                        <div className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-8">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-4">
                                    <h3 className={`text-lg font-black tracking-tight ${pkg.status === 'Active' ? 'text-emerald-600' : pkg.status === 'Low Stock' ? 'text-amber-500' : 'text-rose-600'}`}>
                                        {pkg.status.toUpperCase()}
                                    </h3>
                                    <p className="text-sm text-slate-500 font-medium">
                                        Updated {new Date().toLocaleDateString()}
                                    </p>
                                </div>

                                <div className="flex items-start gap-4 p-1">
                                    <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                        <Package className={`h-8 w-8 ${pkg.status === 'Active' ? 'text-emerald-200' : 'text-gray-300'}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-[#007185] hover:text-[#F7CA00] hover:underline cursor-pointer leading-snug">
                                            {pkg.name} - Professional Premium Distribution Unit
                                        </p>
                                        <p className="text-xs text-slate-500 mt-2 font-medium">Last Inventory Re-count: 2 hours ago</p>
                                        <button className="mt-4 px-4 py-1.5 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#F0C14B] rounded-lg text-xs font-bold shadow-sm shadow-[#F7CA00]/10 flex items-center gap-2 transition-all">
                                            <Edit className="h-4 w-4" />
                                            Update Inventory
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side Actions - Identical to Orders */}
                            <div className="flex flex-col gap-2 w-full md:w-56">
                                <Link href="#" className="w-full text-center py-1.5 bg-[#F7CA00] text-slate-900 hover:bg-[#e6be00] rounded-lg text-xs font-bold shadow-sm transition-all border border-[#F0C14B]">
                                    Product performance
                                </Link>
                                <button className="w-full text-center py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-bold shadow-sm transition-all">
                                    Share listing details
                                </button>
                                <button className="w-full text-center py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-bold shadow-sm transition-all">
                                    View on public shop
                                </button>
                                <button className="w-full text-center py-1.5 border border-gray-300 transition-all hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-lg text-xs font-bold shadow-sm">
                                    Delete listing
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Footer - Same to same */}
            <div className="mt-12 pt-8 border-t border-gray-200 text-center">
                <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">End of Catalog</p>
            </div>
        </div>
    );
}
