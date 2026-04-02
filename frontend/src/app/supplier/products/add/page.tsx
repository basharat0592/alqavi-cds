'use client';

import { useState } from 'react';
import { 
    Package, 
    ArrowLeft, 
    Upload, 
    DollarSign, 
    Box, 
    Tag, 
    Info,
    ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AddSupplierProduct() {
    const router = useRouter();
    const [dragging, setDragging] = useState(false);

    return (
        <div className="max-w-[800px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            
            {/* Header / Breadcrumb */}
            <div className="mb-8 px-2">
                <Link href="/supplier/products" className="text-[11px] font-black text-[#007185] hover:text-[#F7CA00] inline-flex items-center gap-1 mb-4 uppercase tracking-[0.2em] transition-colors">
                    <ArrowLeft size={12} /> Back to Catalog
                </Link>
                <h1 className="text-3xl font-medium text-slate-900 border-b pb-4 tracking-tight">List New Product</h1>
            </div>

            {/* Main Form Area */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-8 space-y-10">
                    
                    {/* Visual Asset Upload */}
                    <section>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Product Visuals</h3>
                        <div 
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                                dragging ? 'border-[#F7CA00] bg-yellow-50' : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <Upload className={`h-8 w-8 ${dragging ? 'text-[#F7CA00]' : 'text-gray-300'}`} />
                            </div>
                            <p className="text-sm font-bold text-slate-900">Drag imagery here or <span className="text-[#007185] cursor-pointer hover:underline">browse files</span></p>
                            <p className="text-[10px] text-slate-400 mt-2 font-medium">Recommended: 1000 x 1000px White Background</p>
                        </div>
                    </section>

                    {/* Core Information */}
                    <section className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6 md:col-span-2">
                            <label className="block">
                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest block mb-2">Detailed Product Title</span>
                                <input type="text" placeholder="e.g. Al-Qavi Radiance Serum 50ml" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F7CA00] focus:bg-white transition-all text-sm" />
                            </label>
                        </div>

                        <div>
                            <label className="block">
                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest block mb-2">Category Division</span>
                                <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F7CA00] focus:bg-white transition-all text-sm appearance-none">
                                    <option>Skincare Division</option>
                                    <option>Makeup Division</option>
                                    <option>Haircare Division</option>
                                    <option>Fragrance Division</option>
                                </select>
                            </label>
                        </div>

                        <div>
                            <label className="block">
                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest block mb-2">Inventory Stock (Units)</span>
                                <div className="relative">
                                    <Box className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input type="number" placeholder="0" className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F7CA00] focus:bg-white transition-all text-sm" />
                                </div>
                            </label>
                        </div>

                        <div>
                            <label className="block">
                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest block mb-2">Wholesale Unit Price</span>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input type="number" placeholder="0.00" className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F7CA00] focus:bg-white transition-all text-sm" />
                                </div>
                            </label>
                        </div>

                        <div>
                            <label className="block">
                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest block mb-2">SKU Reference Code</span>
                                <div className="relative">
                                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input type="text" placeholder="AUTO-GENERATE" className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F7CA00] focus:bg-white transition-all text-sm" />
                                </div>
                            </label>
                        </div>
                    </section>
                </div>

                {/* Footer Actions */}
                <div className="bg-gray-50 px-8 py-6 flex items-center justify-between border-t border-gray-100">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        <Info size={14} /> Draft auto-saved
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => router.back()} className="px-6 py-2 text-xs font-black text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest">Discard</button>
                        <button className="px-8 py-2.5 bg-[#F7CA00] text-slate-900 font-black text-xs uppercase tracking-widest rounded-lg hover:bg-[#e6be00] transition-all shadow-lg shadow-yellow-500/10">Submit Listing</button>
                    </div>
                </div>
            </div>

            {/* Guidelines */}
            <div className="mt-12 p-6 bg-slate-900 rounded-2xl text-white">
                <h4 className="text-[11px] font-black text-[#F7CA00] uppercase tracking-[0.3em] mb-3">Partner Guidelines</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">Please ensure all product imagery meets our distribution standards. Listings submitted with incomplete data or invalid certifications may experience processing delays in the central hub.</p>
            </div>
        </div>
    );
}
