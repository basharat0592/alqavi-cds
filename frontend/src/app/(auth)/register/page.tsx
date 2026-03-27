'use client';

import Link from 'next/link';
import { User, Building2, ShieldCheck, ChevronRight } from 'lucide-react';

export default function RegisterChoicePage() {
    return (
        <div className="min-h-screen bg-[#f1f1f1] flex flex-col font-sans">
            {/* Simple Top Bar */}
            <header className="bg-white border-b border-[#ddd] py-4 shadow-sm flex items-center justify-center">
                <Link href="/" className="flex flex-col items-center">
                    <span className="font-extrabold text-2xl text-[#111] tracking-tighter">AL-QAVI</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Cosmetics Distributor</span>
                </Link>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-3xl bg-white border border-[#ddd] rounded shadow-sm overflow-hidden">
                    <div className="bg-[#f6f6f6] px-6 py-4 border-b border-[#ddd]">
                        <h1 className="text-xl font-bold text-[#111]">Join the Network</h1>
                        <p className="text-xs text-gray-600 font-medium">Please select your primary activity on the platform</p>
                    </div>

                    <div className="p-8 grid md:grid-cols-3 gap-6">
                        {/* Customer Choice */}
                        <Link href="/register/customer" 
                            className="group p-6 border border-[#ddd] rounded hover:border-[#e77600] hover:shadow-md transition-all flex flex-col gap-4 focus:ring-2 focus:ring-[#e77600] outline-none text-left">
                            <div className="w-12 h-12 bg-white border border-[#ddd] rounded flex items-center justify-center group-hover:border-[#e77600]">
                                <User className="h-6 w-6 text-gray-700" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-[#111] flex items-center justify-between">
                                    Customer 
                                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#e77600]" />
                                </h2>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">Shop for personal or retail use from our extensive catalog.</p>
                            </div>
                        </Link>

                        {/* Supplier Choice */}
                        <Link href="/register/supplier" 
                            className="group p-6 border border-[#ddd] rounded hover:border-[#e77600] hover:shadow-md transition-all flex flex-col gap-4 focus:ring-2 focus:ring-[#e77600] outline-none text-left">
                            <div className="w-12 h-12 bg-white border border-[#ddd] rounded flex items-center justify-center group-hover:border-[#e77600]">
                                <Building2 className="h-6 w-6 text-gray-700" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-[#111] flex items-center justify-between">
                                    Supplier
                                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#e77600]" />
                                </h2>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">List and wholesale your brand products across Pakistan.</p>
                            </div>
                        </Link>

                        {/* Admin Choice */}
                        <Link href="/register/admin" 
                            className="group p-6 border border-[#ddd] rounded hover:border-red-600 hover:shadow-md transition-all flex flex-col gap-4 focus:ring-2 focus:ring-red-600 outline-none text-left">
                            <div className="w-12 h-12 bg-white border border-[#ddd] rounded flex items-center justify-center group-hover:border-red-600">
                                <ShieldCheck className="h-6 w-6 text-gray-700" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-[#111] flex items-center justify-between">
                                    Admin
                                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-red-600" />
                                </h2>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">Manage system operations, users, and distributor analytics.</p>
                            </div>
                        </Link>
                    </div>

                    <div className="px-8 pb-8 text-center pt-2">
                        <hr className="border-[#eee] mb-6" />
                        <p className="text-sm text-gray-600">
                            Already registered?{' '}
                            <Link href="/login" className="text-[#0066c0] hover:text-[#c45500] hover:underline underline-offset-2">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
                
                {/* Minimal Footer */}
                <div className="mt-8 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Al-Qavi Cosmetics Distributor Network © 2026</p>
                </div>
            </main>
        </div>
    );
}
