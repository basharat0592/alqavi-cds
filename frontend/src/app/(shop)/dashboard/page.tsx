'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { authService, User as AuthUser } from '@/lib/auth';
import {
    Package,
    ShieldCheck,
    Truck,
    Heart,
    LogOut,
    ShoppingBag,
    User as UserIcon,
    MapPin,
    CreditCard,
    HelpCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CustomerDashboard() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const router = useRouter();

    useEffect(() => {
        setUser(authService.getUser());
    }, []);

    const ACCOUNT_CARDS = [
        {
            title: "Your Orders",
            desc: "Track, return, or buy things again",
            icon: Package,
            href: "/dashboard/orders",
            color: "text-[#F59E0B]"
        },
        {
            title: "Login & Security",
            desc: "Edit login, name, and mobile number",
            icon: ShieldCheck,
            href: "/dashboard/profile",
            color: "text-[#F59E0B]"
        },
        {
            title: "Track Order",
            desc: "View real-time status of your shipments",
            icon: Truck,
            href: "/tracking",
            color: "text-[#F59E0B]"
        },
        {
            title: "Your Wishlist",
            desc: "View and manage items saved for later",
            icon: Heart,
            href: "/dashboard/wishlist",
            color: "text-[#F59E0B]"
        },
        {
            title: "Store Directory",
            desc: "Browse our latest cosmetic collections",
            icon: ShoppingBag,
            href: "/shop",
            color: "text-[#F59E0B]"
        },
        {
            title: "Help Center",
            desc: "Contact support for any inquiries",
            icon: HelpCircle,
            href: "/shop",
            color: "text-[#F59E0B]"
        }
    ];

    return (
        <div className="max-w-[1000px] mx-auto py-10 animate-in fade-in duration-700">
            
            {/* Header Area */}
            <div className="mb-8 px-2">
                <h1 className="text-3xl font-medium text-slate-900 border-b pb-4 mb-2">Your Account</h1>
                <p className="text-sm text-slate-600 font-medium">Hello, <span className="font-bold">{user?.name}</span>. Manage your account settings and orders below.</p>
            </div>

            {/* Account Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {ACCOUNT_CARDS.map((card, idx) => (
                    <Link 
                        key={idx} 
                        href={card.href}
                        className="flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all group"
                    >
                        <div className={`p-4 bg-white border border-gray-100 rounded-full shadow-sm ${card.color}`}>
                            <card.icon className="h-7 w-7" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-[17px] font-bold text-slate-900 group-hover:text-[#F59E0B] transition-colors">{card.title}</h2>
                            <p className="text-sm text-slate-500 mt-0.5 leading-snug">{card.desc}</p>
                        </div>
                    </Link>
                ))}

                {/* Logout Card */}
                <button 
                    onClick={() => {
                        authService.logout();
                        router.push('/');
                    }}
                    className="flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:bg-rose-50 transition-all group text-left"
                >
                    <div className="p-4 bg-white border border-gray-100 rounded-full shadow-sm text-rose-500">
                        <LogOut className="h-7 w-7" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-[17px] font-bold text-slate-900 group-hover:text-rose-600 transition-colors">Sign Out</h2>
                        <p className="text-sm text-slate-500 mt-0.5 leading-snug">Securely log out of your account</p>
                    </div>
                </button>
            </div>

            {/* Bottom Links */}
            <div className="mt-12 pt-8 border-t border-gray-200 grid md:grid-cols-2 gap-8 px-2">
                <div>
                    <h3 className="font-bold text-slate-900 mb-3">Orders & Shopping Preferences</h3>
                    <ul className="text-sm space-y-2 text-[#F59E0B]">
                        <li><Link href="/dashboard/orders" className="hover:text-[#F59E0B] hover:underline underline-offset-2">Your Orders</Link></li>
                        <li><Link href="/dashboard/wishlist" className="hover:text-[#F59E0B] hover:underline underline-offset-2">Your Wishlist</Link></li>
                        <li><Link href="/shop" className="hover:text-[#F59E0B] hover:underline underline-offset-2">Recently Viewed Items</Link></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 mb-3">Account Settings</h3>
                    <ul className="text-sm space-y-2 text-[#F59E0B]">
                        <li><Link href="/dashboard/profile" className="hover:text-[#F59E0B] hover:underline underline-offset-2">Login & Security</Link></li>
                        <li><Link href="/dashboard/profile" className="hover:text-[#F59E0B] hover:underline underline-offset-2">Your Addresses</Link></li>
                        <li><Link href="/dashboard/profile" className="hover:text-[#F59E0B] hover:underline underline-offset-2">Your Content and Devices</Link></li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
