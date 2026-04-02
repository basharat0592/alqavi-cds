'use client';

import { useState } from 'react';
import {
    Boxes,
    Search,
    ChevronRight,
    PackageCheck,
    AlertTriangle,
    History,
    Download,
    Eye,
    ExternalLink
} from 'lucide-react';
import Link from 'next/link';

export default function SupplierInventory() {
    const [filter, setFilter] = useState('all');

    const MOCK_INVENTORY = [
        { id: 101, product: "Glow Radiance Serum", batch: "BATCH-A12", stock: 1240, status: "In Stock", location: "Sector 4-B", last_update: "2024-03-28" },
        { id: 102, product: "Matte Finish Foundation", batch: "BATCH-B09", stock: 856, status: "In Stock", location: "Sector 1-A", last_update: "2024-03-27" },
        { id: 103, product: "Midnight Recovery Oil", batch: "BATCH-C44", stock: 42, status: "Low Stock", location: "Sector 2-C", last_update: "2024-03-28" },
        { id: 104, product: "Velvet Lip Tint", batch: "BATCH-D21", stock: 0, status: "Stock Out", location: "Sector 5-G", last_update: "2024-03-25" }
    ];

    return (
        <div className="max-w-[900px] mx-auto animate-in fade-in duration-500 pb-20">

            {/* Title Area - Same to same */}
            <div className="mb-6">
                <h1 className="text-3xl font-medium text-slate-900 mb-6">Warehouse Status</h1>

                {/* Filter Tabs - Same to same */}
                <div className="flex gap-8 border-b border-gray-200">
                    {['all', 'in stock', 'low stock', 'stock out'].map(t => (
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
                            {t === 'all' ? 'Inventory Registry' : t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Statistics Row - Same to same */}
            <p className="text-sm text-slate-600 mb-6 font-medium">
                <span className="font-bold">{MOCK_INVENTORY.length} items</span> currently tracked in
                <span className="text-[#007185] hover:underline cursor-pointer ml-1 font-bold">Sector 4-B Distribution</span>
            </p>

            {/* Inventory Cards - SAME TO SAME as Orders */}
            <div className="space-y-6">
                {MOCK_INVENTORY.map(item => (
                    <div key={item.id} className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">

                        {/* Card Header (metadata) - Identical to Orders */}
                        <div className="bg-[#f0f2f2] border-b border-gray-300 px-6 py-4 flex flex-wrap items-center justify-between gap-6 text-[11px] font-medium text-slate-600 uppercase tracking-wider">
                            <div className="flex gap-10">
                                <div className="flex flex-col gap-1">
                                    <span>Division Batch</span>
                                    <div className="hidden lg:block w-px h-12 bg-slate-200 dark:bg-white/10 mx-2" />
                                    <span className="text-sm font-bold text-slate-800 tracking-tight">
                                        {item.batch}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span>Quantity</span>
                                    <span className={`text-sm font-bold tracking-tight ${item.stock > 100 ? 'text-slate-800' : 'text-rose-600'}`}>
                                        {item.stock.toLocaleString()} Units
                                    </span>
                                </div>
                                <div className="hidden sm:flex flex-col gap-1">
                                    <span>Shelf Location</span>
                                    <span className="text-sm font-bold text-[#007185] hover:text-red-700 hover:underline cursor-pointer tracking-tight uppercase">{item.location}</span>
                                </div>
                            </div>
                            <div className="text-right flex flex-col gap-1">
                                <span>Entry ID # {item.id}</span>
                                <div className="flex items-center gap-3 justify-end text-[#007185]">
                                    <Link href="#" className="hover:text-red-700 hover:underline">View Batch History</Link>
                                    <div className="w-[1px] h-3 bg-gray-300" />
                                    <Link href="#" className="hover:text-red-700 hover:underline">Download Report</Link>
                                </div>
                            </div>
                        </div>

                        {/* Card Content - Identical to Orders */}
                        <div className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-8">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-4">
                                    <h3 className={`text-lg font-black tracking-tight ${item.status === 'In Stock' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {item.status.toUpperCase()}
                                    </h3>
                                    <p className="text-sm text-slate-500 font-medium">
                                        Last count on {new Date(item.last_update).toLocaleDateString()}
                                    </p>
                                </div>

                                <div className="flex items-start gap-4 p-1">
                                    <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                        <Boxes className="h-8 w-8 text-gray-300" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-[#007185] hover:text-[#F7CA00] hover:underline cursor-pointer leading-snug">
                                            {item.product} - Global Distribution Stock Module
                                        </p>
                                        <p className="text-xs text-slate-500 mt-2 font-medium">Standard Warehouse Storage Protocol active.</p>
                                        <button className="mt-4 px-4 py-1.5 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#F0C14B] rounded-lg text-xs font-bold shadow-sm shadow-[#F7CA00]/10 flex items-center gap-2 transition-all">
                                            <PackageCheck className="h-4 w-4" />
                                            Manual Audit
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side Actions - Identical to Orders */}
                            <div className="flex flex-col gap-2 w-full md:w-56">
                                <button className="w-full text-center py-1.5 bg-[#F7CA00] text-slate-900 hover:bg-[#e6be00] rounded-lg text-xs font-bold shadow-sm transition-all border border-[#F0C14B]">
                                    Log stock movement
                                </button>
                                <button className="w-full text-center py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-bold shadow-sm transition-all">
                                    Generate QR Labels
                                </button>
                                <button className="w-full text-center py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-bold shadow-sm transition-all">
                                    Archive batch
                                </button>
                                <button className="w-full text-center py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-bold shadow-sm transition-all">
                                    Request re-stock
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Footer - Same to same */}
            <div className="mt-12 text-center">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">End of Registry</p>
            </div>
        </div>
    );
}
