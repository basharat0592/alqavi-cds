'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { authService } from '@/lib/auth';
import {
    Package,
    Boxes,
    TrendingUp,
    ShieldCheck,
    LogOut,
    PlusCircle,
    User as UserIcon,
    HelpCircle,
    Truck,
    Building2,
    ShoppingCart
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SupplierDashboard() {
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        setUser(authService.getUser());
    }, []);

    const SUPPLIER_CARDS = [
        {
            title: "Manage Catalog",
            desc: "Add, edit, or remove your products",
            icon: Package,
            href: "/supplier/products",
            color: "text-[#F7CA00]"
        },
        {
            title: "Partner Security",
            desc: "Manage credentials and business info",
            icon: ShieldCheck,
            href: "/supplier/profile",
            color: "text-[#F7CA00]"
        },
        {
            title: "Warehouse Status",
            desc: "Real-time stock and inventory levels",
            icon: Boxes,
            href: "/supplier/inventory",
            color: "text-[#F7CA00]"
        },
        {
            title: "Sales Summary",
            desc: "View records of your sold items",
            icon: TrendingUp,
            href: "/supplier/sales",
            color: "text-[#F7CA00]"
        },
        {
            title: "Add Inventory",
            desc: "List a new item in the hub",
            icon: PlusCircle,
            href: "/supplier/products/add",
            color: "text-[#F7CA00]"
        },
        {
            title: "Support Center",
            desc: "Contact distributor help desk",
            icon: HelpCircle,
            href: "/supplier/support",
            color: "text-[#F7CA00]"
        }
    ];

    return (
        <div className="max-w-[1000px] mx-auto py-10 animate-in fade-in duration-700">
            
            {/* Header Area - Identical to Customer Dashboard */}
            <div className="mb-8 px-2">
                <h1 className="text-3xl font-medium text-slate-900 border-b pb-4 mb-2">Partner Central</h1>
                <p className="text-sm text-slate-600 font-medium">Hello, <span className="font-bold">{user?.name || 'Partner'}</span>. Welcome to your Al-Qavi Supplier Command Center.</p>
            </div>

            {/* Account Grid - Same to Same */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {SUPPLIER_CARDS.map((card, idx) => (
                    <Link 
                        key={idx} 
                        href={card.href}
                        className="flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all group"
                    >
                        <div className={`p-4 bg-white border border-gray-100 rounded-full shadow-sm ${card.color}`}>
                            <card.icon className="h-7 w-7" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-[17px] font-bold text-slate-900 group-hover:text-[#F7CA00] transition-colors">{card.title}</h2>
                            <p className="text-sm text-slate-500 mt-0.5 leading-snug">{card.desc}</p>
                        </div>
                    </Link>
                ))}

                {/* Logout Card */}
                <button 
                    onClick={() => {
                        authService.logout();
                        window.location.href = '/login';
                    }}
                    className="flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:bg-rose-50 transition-all group text-left"
                >
                    <div className="p-4 bg-white border border-gray-100 rounded-full shadow-sm text-rose-500">
                        <LogOut className="h-7 w-7" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-[17px] font-bold text-slate-900 group-hover:text-rose-600 transition-colors">Sign Out</h2>
                        <p className="text-sm text-slate-500 mt-0.5 leading-snug">Securely end your session</p>
                    </div>
                </button>
            </div>

            {/* Bottom Links - Same to Same */}
            <div className="mt-12 pt-8 border-t border-gray-200 grid md:grid-cols-2 gap-8 px-2">
                <div>
                    <h3 className="font-bold text-slate-900 mb-3">Inventory & Product Hub</h3>
                    <ul className="text-sm space-y-2 text-[#007185]">
                        <li><Link href="/supplier/products" className="hover:text-[#F7CA00] hover:underline underline-offset-2">Active Catalog</Link></li>
                        <li><Link href="/supplier/inventory" className="hover:text-[#F7CA00] hover:underline underline-offset-2">Low Stock Alerts</Link></li>
                        <li><Link href="/supplier/products/add" className="hover:text-[#F7CA00] hover:underline underline-offset-2">Mass Listing Upload</Link></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 mb-3">Business Settings</h3>
                    <ul className="text-sm space-y-2 text-[#007185]">
                        <li><Link href="/supplier/profile" className="hover:text-[#F7CA00] hover:underline underline-offset-2">Login & Security</Link></li>
                        <li><Link href="/supplier/profile" className="hover:text-[#F7CA00] hover:underline underline-offset-2">Business Address</Link></li>
                        <li><Link href="/supplier/support" className="hover:text-[#F7CA00] hover:underline underline-offset-2">Partner Guidelines</Link></li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
