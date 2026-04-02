'use client';

import { useState } from 'react';
import {
    TrendingUp,
    Search,
    ChevronRight,
    ShoppingBag,
    DollarSign,
    CreditCard,
    FileText,
    Download
} from 'lucide-react';
import Link from 'next/link';

export default function SupplierSales() {
    const [filter, setFilter] = useState('all');

    const MOCK_SALES = [
        { id: "SL-9921", date: "2024-03-30", amount: 15400, items: 12, status: "Settled", method: "Bank Transfer", ref: "REF-4412" },
        { id: "SL-9918", date: "2024-03-29", amount: 8200, items: 5, status: "Settled", method: "Wallet", ref: "REF-3901" },
        { id: "SL-9915", date: "2024-03-28", amount: 45000, items: 34, status: "Pending", method: "Bank Transfer", ref: "REF-0000" }
    ];

    return (
        <div className="max-w-[900px] mx-auto animate-in fade-in duration-500 pb-20">

            {/* Title Area - Same to same */}
            <div className="mb-6">
                <h1 className="text-3xl font-medium text-slate-900 mb-6">Sale Registry</h1>

                {/* Filter Tabs - Same to same */}
                <div className="flex gap-8 border-b border-gray-200">
                    {['all', 'settled', 'pending', 'cancelled'].map(t => (
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
                            {t === 'all' ? 'Statements' : t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Statistics Row - Same to same */}
            <p className="text-sm text-slate-600 mb-6 font-medium">
                <span className="font-bold">{MOCK_SALES.length} settlements</span> processed in
                <span className="text-[#007185] hover:underline cursor-pointer ml-1 font-bold">this billing cycle</span>
            </p>

            {/* Sales Cards - SAME TO SAME as Orders */}
            <div className="space-y-6">
                {MOCK_SALES.map(sale => (
                    <div key={sale.id} className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">

                        {/* Card Header (metadata) - Identical to Orders */}
                        <div className="bg-[#f0f2f2] border-b border-gray-300 px-6 py-4 flex flex-wrap items-center justify-between gap-6 text-[11px] font-medium text-slate-600 uppercase tracking-wider">
                            <div className="flex gap-10">
                                <div className="flex flex-col gap-1">
                                    <span>Settlement Date</span>
                                    <span className="text-sm font-bold text-slate-800 tracking-tight lowercase first-letter:uppercase">
                                        {new Date(sale.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span>Net Credited</span>
                                    <div className="hidden lg:block w-px h-12 bg-slate-200 dark:bg-white/10 mx-2" />
                                    <span className="text-sm font-bold text-slate-800 tracking-tight">PKR {sale.amount.toLocaleString()}</span>
                                </div>
                                <div className="hidden sm:flex flex-col gap-1">
                                    <span>Method</span>
                                    <span className="text-sm font-bold text-[#007185] hover:text-red-700 hover:underline cursor-pointer tracking-tight capitalize">{sale.method}</span>
                                </div>
                            </div>
                            <div className="text-right flex flex-col gap-1">
                                <span>Ref # {sale.ref}</span>
                                <div className="flex items-center gap-3 justify-end text-[#007185]">
                                    <Link href="#" className="hover:text-red-700 hover:underline">View invoice</Link>
                                    <div className="w-[1px] h-3 bg-gray-300" />
                                    <Link href="#" className="hover:text-red-700 hover:underline">Support</Link>
                                </div>
                            </div>
                        </div>

                        {/* Card Content - Identical to Orders */}
                        <div className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-8">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-4">
                                    <h3 className={`text-lg font-black tracking-tight ${sale.status === 'Settled' ? 'text-emerald-600' : 'text-amber-500'}`}>
                                        {sale.status.toUpperCase()}
                                    </h3>
                                    <p className="text-sm text-slate-500 font-medium">
                                        Resolution Code: {sale.id}
                                    </p>
                                </div>

                                <div className="flex items-start gap-4 p-1">
                                    <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                        <TrendingUp className="h-8 w-8 text-gray-300" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-[#007185] hover:text-[#F7CA00] hover:underline cursor-pointer leading-snug">
                                            Distribution Payout - Settlement for {sale.items} units distributed
                                        </p>
                                        <p className="text-xs text-slate-500 mt-2 font-medium">Standard 7-day maturation cycle completed.</p>
                                        <button className="mt-4 px-4 py-1.5 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#F0C14B] rounded-lg text-xs font-bold shadow-sm shadow-[#F7CA00]/10 flex items-center gap-2 transition-all">
                                            <FileText className="h-4 w-4" />
                                            Download Statement
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side Actions - Identical to Orders */}
                            <div className="flex flex-col gap-2 w-full md:w-56">
                                <button className="w-full text-center py-1.5 bg-[#F7CA00] text-slate-900 hover:bg-[#e6be00] rounded-lg text-xs font-bold shadow-sm transition-all border border-[#F0C14B]">
                                    Transaction details
                                </button>
                                <button className="w-full text-center py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-bold shadow-sm transition-all">
                                    Verify settlement
                                </button>
                                <button className="w-full text-center py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-bold shadow-sm transition-all">
                                    Export as CSV
                                </button>
                                <button className="w-full text-center py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-bold shadow-sm transition-all">
                                    Report discrepancy
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Footer - Same to same */}
            <div className="mt-12 text-center">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">End of Ledger</p>
            </div>
        </div>
    );
}
